import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/packbrain",
});

export default pool;
