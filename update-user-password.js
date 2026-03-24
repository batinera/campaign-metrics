const bcrypt = require('bcrypt')
const { Client } = require('pg')

async function updateUserPassword() {
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

    const updateQuery = `
      UPDATE users 
      SET password = $1, "updatedAt" = NOW()
      WHERE username = $2
      RETURNING id, username, email
    `

    const result = await client.query(updateQuery, [hashedPassword, 'admin'])

    if (result.rows.length > 0) {
      console.log('✅ Password updated for user:', result.rows[0])
    } else {
      console.log('❌ User "admin" not found')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

updateUserPassword().catch(console.error)
