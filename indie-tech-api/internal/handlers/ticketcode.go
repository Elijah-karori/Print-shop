package handlers

import (
	"crypto/rand"
	"strings"
)

// generateTicketCode produces a short, human-readable code like "TKT-7F3K2"
// that a client can read over the phone or WhatsApp without needing an
// account — this backs the "phone number + ticket code" lookup flow instead
// of requiring full client authentication.
func generateTicketCode() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I to avoid confusion
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	var sb strings.Builder
	sb.WriteString("TKT-")
	for _, v := range b {
		sb.WriteByte(alphabet[int(v)%len(alphabet)])
	}
	return sb.String(), nil
}
