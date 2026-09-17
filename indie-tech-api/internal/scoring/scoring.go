package scoring

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/elijah-karori/indie-tech-api/internal/models"
)

type Weights struct {
	Price  float64
	Time   float64
	Rating float64
	Level  float64
	Exp    float64
}

// GetWeights returns dynamic weight matrix matching brief requirements:
// Corrective: (0.10, 0.45, 0.15, 0.15, 0.15)
// Preventive: (0.20, 0.15, 0.15, 0.15, 0.35)
// Contract_based: (0.05, 0.35, 0.15, 0.20, 0.25)
// Enterprise Customer Default: (0.15, 0.30, 0.15, 0.20, 0.20)
// Personal Customer Default: (0.40, 0.20, 0.20, 0.10, 0.10)
func GetWeights(serviceType string, customerType string) Weights {
	switch serviceType {
	case "corrective":
		return Weights{Price: 0.10, Time: 0.45, Rating: 0.15, Level: 0.15, Exp: 0.15}
	case "preventive":
		return Weights{Price: 0.20, Time: 0.15, Rating: 0.15, Level: 0.15, Exp: 0.35}
	case "contract_based":
		return Weights{Price: 0.05, Time: 0.35, Rating: 0.15, Level: 0.20, Exp: 0.25}
	}

	if customerType == "enterprise" {
		return Weights{Price: 0.15, Time: 0.30, Rating: 0.15, Level: 0.20, Exp: 0.20}
	}

	// Personal Customer Default
	return Weights{Price: 0.40, Time: 0.20, Rating: 0.20, Level: 0.10, Exp: 0.10}
}

type RateCardRepo interface {
	GetSpecificRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string, categoryID uuid.UUID) (float64, bool, error)
	GetCategoryAgnosticRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string) (float64, bool, error)
	GetExperienceCount(ctx context.Context, technicianID uuid.UUID, categoryID uuid.UUID) (int, error)
}

type DBRepo struct {
	db *pgxpool.Pool
}

func NewDBRepo(db *pgxpool.Pool) *DBRepo {
	return &DBRepo{db: db}
}

func (r *DBRepo) GetSpecificRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string, categoryID uuid.UUID) (float64, bool, error) {
	var rate float64
	err := r.db.QueryRow(ctx, `
		SELECT rate_kes FROM technician_rate_cards
		WHERE technician_id = $1 AND service_type = $2 AND machine_category_id = $3
	`, technicianID, serviceType, categoryID).Scan(&rate)
	if err != nil {
		return 0, false, nil
	}
	return rate, true, nil
}

func (r *DBRepo) GetCategoryAgnosticRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string) (float64, bool, error) {
	var rate float64
	err := r.db.QueryRow(ctx, `
		SELECT rate_kes FROM technician_rate_cards
		WHERE technician_id = $1 AND service_type = $2 AND machine_category_id IS NULL
	`, technicianID, serviceType).Scan(&rate)
	if err != nil {
		return 0, false, nil
	}
	return rate, true, nil
}

func (r *DBRepo) GetExperienceCount(ctx context.Context, technicianID uuid.UUID, categoryID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT jobs_completed_count FROM technician_machine_experience
		WHERE technician_id = $1 AND machine_category_id = $2
	`, technicianID, categoryID).Scan(&count)
	if err != nil {
		return 0, nil
	}
	return count, nil
}

// ResolveReferencePrice evaluates 4 fallback criteria strictly in order:
// 1. task.target_price_kes (if set and > 0)
// 2. Specific rate card matching (technician_id, task.service_type, task.machine_category_id)
// 3. Category-agnostic rate card matching (technician_id, task.service_type, NULL)
// 4. Technician default base callout fee (technician.base_callout_fee_kes)
func ResolveReferencePrice(ctx context.Context, repo RateCardRepo, task models.Task, tech models.Technician) (float64, error) {
	if task.TargetPriceKES != nil && *task.TargetPriceKES > 0 {
		return *task.TargetPriceKES, nil
	}

	if repo != nil && task.MachineCategoryID != nil {
		rate, found, err := repo.GetSpecificRateCard(ctx, tech.ID, task.ServiceType, *task.MachineCategoryID)
		if err == nil && found && rate > 0 {
			return rate, nil
		}
	}

	if repo != nil {
		rate, found, err := repo.GetCategoryAgnosticRateCard(ctx, tech.ID, task.ServiceType)
		if err == nil && found && rate > 0 {
			return rate, nil
		}
	}

	return tech.BaseCalloutFeeKES, nil
}

func CalculatePriceFitScore(bidAmount float64, refPrice float64) float64 {
	if refPrice <= 0 {
		return 1.0
	}
	score := 1.0 - (math.Abs(bidAmount-refPrice) / refPrice)
	if score < 0 {
		return 0.0
	}
	return score
}

func CalculateExpFitScore(jobsCompletedCount int) float64 {
	if jobsCompletedCount >= 5 {
		return 1.0
	}
	if jobsCompletedCount >= 1 {
		return 0.7
	}
	return 0.3
}

func CalculateRatingFitScore(overallRating float64) float64 {
	if overallRating <= 0 {
		return 0.5
	}
	score := overallRating / 5.0
	if score > 1.0 {
		return 1.0
	}
	return score
}

func CalculateLevelFitScore(level string) float64 {
	switch level {
	case "master":
		return 1.0
	case "senior":
		return 0.85
	case "intermediate":
		return 0.70
	case "junior":
		return 0.50
	default:
		return 0.50
	}
}

func CalculateTimeFitScore(task models.Task, proposedTime *time.Time) float64 {
	if proposedTime == nil {
		return 0.5
	}
	if task.DeadlineTime != nil && proposedTime.After(*task.DeadlineTime) {
		return 0.0
	}
	if task.EarliestStartTime != nil && proposedTime.Before(*task.EarliestStartTime) {
		return 0.5
	}
	return 1.0
}

type ScoredBid struct {
	Bid            models.Bid         `json:"bid"`
	Technician     models.Technician  `json:"technician"`
	ReferencePrice float64            `json:"reference_price"`
	PriceScore     float64            `json:"price_score"`
	TimeScore      float64            `json:"time_score"`
	RatingScore    float64            `json:"rating_score"`
	LevelScore     float64            `json:"level_score"`
	ExpScore       float64            `json:"exp_score"`
	TotalScore     float64            `json:"total_score"`
	Weights        Weights            `json:"weights"`
}

func RankBids(ctx context.Context, repo RateCardRepo, task models.Task, bids []models.Bid, techs map[uuid.UUID]models.Technician) ([]ScoredBid, error) {
	weights := GetWeights(task.ServiceType, task.CustomerType)
	var scored []ScoredBid

	for _, bid := range bids {
		tech, exists := techs[bid.TechnicianID]
		if !exists {
			tech = models.Technician{ID: bid.TechnicianID, OverallRating: 5.0, Level: "junior", BaseCalloutFeeKES: 500.0}
		}

		refPrice, _ := ResolveReferencePrice(ctx, repo, task, tech)
		pScore := CalculatePriceFitScore(bid.BidAmountKES, refPrice)
		tScore := CalculateTimeFitScore(task, bid.ProposedStartTime)
		rScore := CalculateRatingFitScore(tech.OverallRating)
		lScore := CalculateLevelFitScore(tech.Level)

		expJobs := 0
		if repo != nil && task.MachineCategoryID != nil {
			expJobs, _ = repo.GetExperienceCount(ctx, tech.ID, *task.MachineCategoryID)
		}
		eScore := CalculateExpFitScore(expJobs)

		total := (weights.Price * pScore) + (weights.Time * tScore) + (weights.Rating * rScore) + (weights.Level * lScore) + (weights.Exp * eScore)

		scored = append(scored, ScoredBid{
			Bid:            bid,
			Technician:     tech,
			ReferencePrice: refPrice,
			PriceScore:     pScore,
			TimeScore:      tScore,
			RatingScore:    rScore,
			LevelScore:     lScore,
			ExpScore:       eScore,
			TotalScore:     total,
			Weights:        weights,
		})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].TotalScore > scored[j].TotalScore
	})

	return scored, nil
}
