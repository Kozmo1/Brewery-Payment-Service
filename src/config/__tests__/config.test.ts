import { config } from "../../config/config";

// Mock dotenv-safe to control environment loading in tests
jest.mock("dotenv-safe", () => ({
	config: jest.fn((options) => {
		// Simulate no .env file when path is missing or points to nonexistent
		if (!options.path || options.path.includes("nonexistent")) {
			return { parsed: {} };
		}
		return { parsed: process.env };
	}),
}));

describe("config", () => {
	// Reset module cache before each test to reload config fresh
	beforeEach(() => {
		jest.resetModules();
	});

	// Test fallback values when environment variables are unset
	it("should use fallback values if environment variables are not set", () => {
		// Store the original environment to restore later
		const originalEnv = { ...process.env };
		// Wipe out variables to trigger fallbacks
		delete process.env.NODE_ENV;
		delete process.env.BREWERY_API_URL;
		delete process.env.JWT_SECRET;
		delete process.env.PORT;

		// Load config with no env vars
		const { config } = require("../../config/config");

		// Check each fallback kicks in properly
		expect(config.environment).toBe("development");
		expect(config.breweryApiUrl).toBe("http://localhost:5089");
		expect(config.jwtSecret).toBe("");
		expect(config.port).toBe(3003);

		// Put the original env back
		process.env = originalEnv;
	});

	// Test that config picks up environment variables when they’re set
	it("should use environment variables when they are set", () => {
		// Store the original environment
		const originalEnv = { ...process.env };
		// Set some custom values
		process.env.NODE_ENV = "production";
		process.env.BREWERY_API_URL = "https://api.brewery.com";
		process.env.JWT_SECRET = "my-secret-key";
		process.env.PORT = "4000";

		// Load config with env vars set
		const { config } = require("../../config/config");

		// Verify it’s using the env values
		expect(config.environment).toBe("production");
		expect(config.breweryApiUrl).toBe("https://api.brewery.com");
		expect(config.jwtSecret).toBe("my-secret-key");
		expect(config.port).toBe(4000);

		// Restore the original env
		process.env = originalEnv;
	});

	// Test behavior when there’s no .env file to load
	it("should handle missing .env file gracefully", () => {
		// Store the original environment
		const originalEnv = { ...process.env };
		// Set NODE_ENV to something that won’t match a real file
		process.env.NODE_ENV = "nonexistent";
		delete process.env.BREWERY_API_URL;
		delete process.env.JWT_SECRET;
		delete process.env.PORT;

		// Load config with no .env file
		const { config } = require("../../config/config");

		// Make sure it uses NODE_ENV and falls back for the rest
		expect(config.environment).toBe("nonexistent");
		expect(config.breweryApiUrl).toBe("http://localhost:5089");
		expect(config.jwtSecret).toBe("");
		expect(config.port).toBe(3003);

		// Restore the original env
		process.env = originalEnv;
	});
});
