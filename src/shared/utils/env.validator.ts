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

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "Missing required environment variables:",
      missing.join(", ")
    );
    process.exit(1);
  }
};
