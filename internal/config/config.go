package config

import (
	"fmt"
	"os"
	"time"
)

const defaultPollInterval = 5 * time.Minute

type Config struct {
	GoogleCloudProject string
	PollInterval       time.Duration
	URLsCollection     string
	FFProbeBinary      string
	FFProbeTimeout     time.Duration
	APIListenAddr      string
	APIToken           string // Secret token for UI->API authentication
}

func Load() (Config, error) {
	cfg := Config{
		GoogleCloudProject: os.Getenv("GOOGLE_CLOUD_PROJECT"),
		PollInterval:       defaultPollInterval,
		URLsCollection:     "registered_rtmp_urls",
		FFProbeBinary:      "ffprobe",
		FFProbeTimeout:     10 * time.Second,
		APIListenAddr:      ":8080",
	}

	if v := os.Getenv("POLL_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid POLL_INTERVAL %q: %w", v, err)
		}
		cfg.PollInterval = d
	}

	if v := os.Getenv("URLS_COLLECTION"); v != "" {
		cfg.URLsCollection = v
	}

	if v := os.Getenv("FFPROBE_BINARY"); v != "" {
		cfg.FFProbeBinary = v
	}

	if v := os.Getenv("FFPROBE_TIMEOUT"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("invalid FFPROBE_TIMEOUT %q: %w", v, err)
		}
		cfg.FFProbeTimeout = d
	}

	if v := os.Getenv("API_LISTEN_ADDR"); v != "" {
		cfg.APIListenAddr = v
	}

	if v := os.Getenv("API_TOKEN"); v != "" {
		cfg.APIToken = v
	} else {
		// Default token for local development
		cfg.APIToken = "dev-token-change-in-production"
	}

	return cfg, nil
}
