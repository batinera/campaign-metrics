const axios = require('axios')

const API_URL = 'http://localhost:3000'

async function login() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    username: 'admin',
    password: 'Admin@123',
  })
  return response.data.access_token
}

async function testNotFoundError(token) {
  const query = `
    query {
      campaigns(
        filter: {
          accountId: "act_721084900278023"
          campaignId: "999999999999999"
          status: ACTIVE
          datePreset: LAST_7D
        }
      ) {
        id
        name
      }
    }
  `

  try {
    const response = await axios.post(
      `${API_URL}/graphql`,
      { query },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.data.errors) {
      console.log('\n✅ Error correctly returned:')
      console.log(JSON.stringify(response.data.errors, null, 2))

      const graphqlCode = response.data.errors[0]?.extensions?.code
      const errorCode = response.data.errors[0]?.extensions?.errorCode

      console.log(`\n📋 GraphQL Code: ${graphqlCode}`)
      console.log(`📋 Error Code: ${errorCode}`)

      if (errorCode === 'CAMPAIGN_NOT_FOUND' && graphqlCode === 'NOT_FOUND') {
        console.log('\n✅ Specific error code CAMPAIGN_NOT_FOUND is working!')
      } else {
        console.log(
          `\n⚠️  Expected CAMPAIGN_NOT_FOUND/NOT_FOUND but got: ${errorCode}/${graphqlCode}`,
        )
      }
    } else {
      console.log('\n⚠️  No errors returned (unexpected)')
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }
}

async function testInvalidAccountError(token) {
  const query = `
    query {
      campaigns(
        filter: {
          accountId: "act_999999999999"
          status: ACTIVE
          datePreset: LAST_7D
        }
      ) {
        id
        name
      }
    }
  `

  try {
    const response = await axios.post(
      `${API_URL}/graphql`,
      { query },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.data.errors) {
      console.log('\n✅ Error correctly returned:')
      console.log(JSON.stringify(response.data.errors, null, 2))

      const errorCode = response.data.errors[0]?.extensions?.code
      console.log(`\n📋 Error code: ${errorCode}`)
    } else {
      console.log('\n⚠️  No errors returned (unexpected)')
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message)
  }
}

async function main() {
  console.log('🧪 Testing error handling...\n')

  console.log('1. Logging in...')
  const token = await login()
  console.log('✅ Login successful\n')

  console.log('2. Testing 404 error (invalid campaign ID)...')
  await testNotFoundError(token)

  console.log('\n3. Testing invalid account error...')
  await testInvalidAccountError(token)
}

main().catch(console.error)
