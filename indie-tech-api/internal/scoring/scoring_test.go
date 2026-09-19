package scoring_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/elijah-karori/indie-tech-api/internal/models"
	"github.com/elijah-karori/indie-tech-api/internal/scoring"
)

type mockRepo struct {
	specificCard float64
	agnosticCard float64
	expJobs      int
}

func (m *mockRepo) GetSpecificRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string, categoryID uuid.UUID) (float64, bool, error) {
	if m.specificCard > 0 {
		return m.specificCard, true, nil
	}
	return 0, false, nil
}

func (m *mockRepo) GetCategoryAgnosticRateCard(ctx context.Context, technicianID uuid.UUID, serviceType string) (float64, bool, error) {
	if m.agnosticCard > 0 {
		return m.agnosticCard, true, nil
	}
	return 0, false, nil
}

func (m *mockRepo) GetExperienceCount(ctx context.Context, technicianID uuid.UUID, categoryID uuid.UUID) (int, error) {
	return m.expJobs, nil
}

func TestResolveReferencePrice_FallbackLevels(t *testing.T) {
	ctx := context.Background()
	techID := uuid.New()
	catID := uuid.New()

	tech := models.Technician{
		ID:                techID,
		BaseCalloutFeeKES: 800.0,
	}

	// Level 1: Target price set on task
	targetPrice := 1500.0
	taskWithTarget := models.Task{
		ServiceType:       "corrective",
		MachineCategoryID: &catID,
		TargetPriceKES:    &targetPrice,
	}
	repo1 := &mockRepo{specificCard: 2000.0, agnosticCard: 1800.0}
	price, err := scoring.ResolveReferencePrice(ctx, repo1, taskWithTarget, tech)
	if err != nil || price != 1500.0 {
		t.Errorf("expected level 1 fallback target price 1500.0, got %f, err: %v", price, err)
	}

	// Level 2: Specific rate card
	taskNoTarget := models.Task{
		ServiceType:       "corrective",
		MachineCategoryID: &catID,
	}
	repo2 := &mockRepo{specificCard: 2000.0, agnosticCard: 1800.0}
	price, err = scoring.ResolveReferencePrice(ctx, repo2, taskNoTarget, tech)
	if err != nil || price != 2000.0 {
		t.Errorf("expected level 2 fallback specific rate card 2000.0, got %f, err: %v", price, err)
	}

	// Level 3: Category agnostic rate card
	repo3 := &mockRepo{specificCard: 0, agnosticCard: 1800.0}
	price, err = scoring.ResolveReferencePrice(ctx, repo3, taskNoTarget, tech)
	if err != nil || price != 1800.0 {
		t.Errorf("expected level 3 fallback category-agnostic rate card 1800.0, got %f, err: %v", price, err)
	}

	// Level 4: Default base callout fee
	repo4 := &mockRepo{specificCard: 0, agnosticCard: 0}
	price, err = scoring.ResolveReferencePrice(ctx, repo4, taskNoTarget, tech)
	if err != nil || price != 800.0 {
		t.Errorf("expected level 4 fallback base callout fee 800.0, got %f, err: %v", price, err)
	}
}

func TestDynamicWeightAssignment(t *testing.T) {
	// Corrective
	w1 := scoring.GetWeights("corrective", "personal")
	if w1.Price != 0.10 || w1.Time != 0.45 || w1.Rating != 0.15 || w1.Level != 0.15 || w1.Exp != 0.15 {
		t.Errorf("incorrect corrective weights: %+v", w1)
	}

	// Preventive
	w2 := scoring.GetWeights("preventive", "personal")
	if w2.Price != 0.20 || w2.Time != 0.15 || w2.Rating != 0.15 || w2.Level != 0.15 || w2.Exp != 0.35 {
		t.Errorf("incorrect preventive weights: %+v", w2)
	}

	// Contract based
	w3 := scoring.GetWeights("contract_based", "personal")
	if w3.Price != 0.05 || w3.Time != 0.35 || w3.Rating != 0.15 || w3.Level != 0.20 || w3.Exp != 0.25 {
		t.Errorf("incorrect contract_based weights: %+v", w3)
	}

	// Enterprise Default
	w4 := scoring.GetWeights("other", "enterprise")
	if w4.Price != 0.15 || w4.Time != 0.30 || w4.Rating != 0.15 || w4.Level != 0.20 || w4.Exp != 0.20 {
		t.Errorf("incorrect enterprise default weights: %+v", w4)
	}

	// Personal Default
	w5 := scoring.GetWeights("other", "personal")
	if w5.Price != 0.40 || w5.Time != 0.20 || w5.Rating != 0.20 || w5.Level != 0.10 || w5.Exp != 0.10 {
		t.Errorf("incorrect personal default weights: %+v", w5)
	}
}

func TestExpFitScore(t *testing.T) {
	if s := scoring.CalculateExpFitScore(10); s != 1.0 {
		t.Errorf("expected 1.0 for >= 5 jobs, got %f", s)
	}
	if s := scoring.CalculateExpFitScore(3); s != 0.7 {
		t.Errorf("expected 0.7 for 1-4 jobs, got %f", s)
	}
	if s := scoring.CalculateExpFitScore(0); s != 0.3 {
		t.Errorf("expected 0.3 for 0 jobs, got %f", s)
	}
}
