export const validateEnvVariables = () => {
  const required = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_DATABASE",
  ];

  const optional = ["JWT_ACCESS_EXPIRY", "JWT_REFRESH_EXPIRY"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "Missing required environment variables:",
      missing.join(", ")
    );
    process.exit(1);
  }

  const timeRegex = /^(\d+)(s|m|h|d)$/; // 1s, 30m, 24h, 7d 형식

  if (
    process.env.JWT_ACCESS_EXPIRY &&
    !timeRegex.test(process.env.JWT_ACCESS_EXPIRY)
  ) {
    console.error(
      "Invalid JWT_ACCESS_EXPIRY format. Use format like: 30m, 24h, 7d"
    );
    process.exit(1);
  }

  if (
    process.env.JWT_REFRESH_EXPIRY &&
    !timeRegex.test(process.env.JWT_REFRESH_EXPIRY)
  ) {
    console.error(
      "Invalid JWT_REFRESH_EXPIRY format. Use format like: 30m, 24h, 7d"
    );
    process.exit(1);
  }
};
