package config

import (
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment-driven settings for the service.
// Keep this the single source of truth — handlers should never call
// os.Getenv directly, so we have one place to see what the app depends on.
type Config struct {
	Port        string
	Env         string
	DatabaseURL string

	SupabaseURL string
	SupabaseKey string

	JWTSecret        string
	TicketLookupSalt string

	MpesaEnv            string
	MpesaConsumerKey    string
	MpesaConsumerSecret string
	MpesaShortcode      string
	MpesaPasskey        string
	MpesaCallbackURL    string
	MpesaTillNumber     string

	WhatsAppPhoneNumberID string
	WhatsAppAccessToken   string
	WhatsAppVerifyToken   string
	WhatsAppAPIVersion    string
}

func Load() *Config {
	// Silently ignore if .env doesn't exist (e.g. in production where
	// real env vars are injected by the host).
	_ = godotenv.Load()

	return &Config{
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", ""),

		SupabaseURL: getEnv("SUPABASE_URL", ""),
		SupabaseKey: getEnv("SUPABASE_KEY", ""),

		JWTSecret:        getEnv("JWT_SECRET", ""),
		TicketLookupSalt: getEnv("TICKET_LOOKUP_SALT", ""),

		MpesaEnv:            getEnv("MPESA_ENV", "sandbox"),
		MpesaConsumerKey:    getEnv("MPESA_CONSUMER_KEY", ""),
		MpesaConsumerSecret: getEnv("MPESA_CONSUMER_SECRET", ""),
		MpesaShortcode:      getEnv("MPESA_SHORTCODE", ""),
		MpesaPasskey:        getEnv("MPESA_PASSKEY", ""),
		MpesaCallbackURL:    getEnv("MPESA_CALLBACK_URL", ""),
		MpesaTillNumber:     getEnv("MPESA_TILL_NUMBER", ""),

		WhatsAppPhoneNumberID: getEnv("WHATSAPP_PHONE_NUMBER_ID", ""),
		WhatsAppAccessToken:   getEnv("WHATSAPP_ACCESS_TOKEN", ""),
		WhatsAppVerifyToken:   getEnv("WHATSAPP_VERIFY_TOKEN", ""),
		WhatsAppAPIVersion:    getEnv("WHATSAPP_API_VERSION", "v20.0"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
