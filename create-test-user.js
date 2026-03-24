const bcrypt = require('bcrypt')
const { Client } = require('pg')

async function createTestUser() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'campaign_metrics',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    const hashedPassword = await bcrypt.hash('Admin@123', 10)

    const checkQuery = 'SELECT id FROM users WHERE username = $1'
    const checkResult = await client.query(checkQuery, ['admin'])

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  User "admin" already exists')
      return
    }

    const insertQuery = `
      INSERT INTO users (username, email, password, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, username, email
    `

    const result = await client.query(insertQuery, ['admin', 'admin@example.com', hashedPassword])

    console.log('✅ Test user created:', result.rows[0])
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

createTestUser().catch(console.error)
