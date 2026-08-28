// Package mpesa implements the Safaricom Daraja API integration for STK Push
// (Lipa Na M-Pesa Online). This is a stub with real request/response shapes
// filled in — you still need to:
//   1. Register for Daraja sandbox credentials at developer.safaricom.co.ke
//   2. Set MPESA_* values in .env
//   3. Swap MpesaEnv to "production" and use your paybill/till shortcode
//      once you've gone through Safaricom's go-live process.
package mpesa

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/elijah-karori/indie-tech-api/internal/config"
)

type Client struct {
	cfg        *config.Config
	httpClient *http.Client
	baseURL    string
}

func NewClient(cfg *config.Config) *Client {
	baseURL := "https://sandbox.safaricom.co.ke"
	if cfg.MpesaEnv == "production" {
		baseURL = "https://api.safaricom.co.ke"
	}
	return &Client{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    baseURL,
	}
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   string `json:"expires_in"`
}

// getAccessToken performs OAuth against Daraja using consumer key/secret.
// Tokens are valid ~1 hour; for production, cache this instead of fetching
// per-request (a simple in-memory cache with expiry is enough at this scale).
func (c *Client) getAccessToken(ctx context.Context) (string, error) {
	url := c.baseURL + "/oauth/v1/generate?grant_type=client_credentials"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	auth := base64.StdEncoding.EncodeToString([]byte(c.cfg.MpesaConsumerKey + ":" + c.cfg.MpesaConsumerSecret))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("daraja auth failed (%d): %s", resp.StatusCode, string(body))
	}

	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return "", err
	}
	return tr.AccessToken, nil
}

type STKPushRequest struct {
	PhoneNumber string  // format: 2547XXXXXXXX
	Amount      float64 // KES, whole numbers only per Daraja
	AccountRef  string  // e.g. ticket code or order ID, shown to payer
	Description string  // e.g. "Diagnostic visit fee"
}

type STKPushResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

// InitiateSTKPush triggers the "Enter M-Pesa PIN" prompt on the client's phone.
// Call this from the checkout handler after an order row has been created
// with status 'pending'; store CheckoutRequestID on the order so the callback
// (see /internal/handlers/mpesa_callback.go) can match the confirmation back
// to the right order.
func (c *Client) InitiateSTKPush(ctx context.Context, req STKPushRequest) (*STKPushResponse, error) {
	token, err := c.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("could not get access token: %w", err)
	}

	timestamp := time.Now().Format("20060102150405")
	password := base64.StdEncoding.EncodeToString(
		[]byte(c.cfg.MpesaShortcode + c.cfg.MpesaPasskey + timestamp),
	)

	// Till (Buy Goods) payments: PartyB and the till presented to the customer
	// are the till number itself, not the shortcode used for auth/password.
	// Some Daraja setups use the same value for both — if Safaricom issues you
	// a separate STK-push shortcode for your till, keep MPESA_SHORTCODE as
	// that value and MPESA_TILL_NUMBER as the customer-facing till.
	payload := map[string]interface{}{
		"BusinessShortCode": c.cfg.MpesaShortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerBuyGoodsOnline", // Till number payment
		"Amount":            int(req.Amount),
		"PartyA":            req.PhoneNumber,
		"PartyB":            c.cfg.MpesaTillNumber,
		"PhoneNumber":       req.PhoneNumber,
		"CallBackURL":       c.cfg.MpesaCallbackURL,
		"AccountReference":  req.AccountRef,
		"TransactionDesc":   req.Description,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/mpesa/stkpush/v1/processrequest", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+token)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stk push failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var stkResp STKPushResponse
	if err := json.Unmarshal(respBody, &stkResp); err != nil {
		return nil, err
	}
	return &stkResp, nil
}

// CallbackPayload models the structure Safaricom POSTs to MPESA_CALLBACK_URL
// once the customer completes (or cancels/fails) the STK prompt.
type CallbackPayload struct {
	Body struct {
		StkCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  struct {
				Item []struct {
					Name  string      `json:"Name"`
					Value interface{} `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

// ExtractReceipt pulls the MpesaReceiptNumber out of a successful callback's
// CallbackMetadata items. Returns "" if not present (e.g. on failed payment).
func (p *CallbackPayload) ExtractReceipt() string {
	for _, item := range p.Body.StkCallback.CallbackMetadata.Item {
		if item.Name == "MpesaReceiptNumber" {
			if s, ok := item.Value.(string); ok {
				return s
			}
		}
	}
	return ""
}
