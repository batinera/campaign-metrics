const axios = require('axios')

const API_URL = 'http://localhost:3000'
const JWT_SECRET = 'minha_chave_secreta_para_dashboard_2026'

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123',
    })
    return response.data.access_token
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message)
    throw error
  }
}

async function testCampaignsQuery(token) {
  const query = `
    query {
      campaigns(
        filter: {
          accountId: "act_721084900278023"
          campaignId: "120241565567930441"
          status: ACTIVE
          datePreset: LAST_7D
          sortBy: NAME
          sortOrder: DESC
        }
      ) {
        id
        name
        status
        summary {
          spend
          results
          cpa
          reach
          impressions
          ctr
          cpm
        }
        chart {
          date
          spend
          impressions
        }
        adSets {
          id
          name
          summary {
            spend
            results
            cpa
          }
          chart {
            date
            spend
            impressions
          }
          ads {
            id
            name
            status
            creative {
              id
              name
              image_url
            }
          }
        }
      }
    }
  `

  const startTime = Date.now()

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

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`\n✅ Query completed in ${duration}ms`)

    if (response.data.errors) {
      console.error('\n❌ GraphQL Errors:', JSON.stringify(response.data.errors, null, 2))
    } else {
      const campaigns = response.data.data.campaigns
      console.log(`\n📊 Results:`)
      console.log(`  - Campaigns: ${campaigns.length}`)
      campaigns.forEach((c, i) => {
        console.log(`    ${i + 1}. ${c.name} (${c.id})`)
        console.log(`       - AdSets: ${c.adSets.length}`)
        const totalAds = c.adSets.reduce((sum, as) => sum + as.ads.length, 0)
        console.log(`       - Total Ads: ${totalAds}`)
      })
    }

    return duration
  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    console.error(`\n❌ Query failed after ${duration}ms:`, error.response?.data || error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting performance test...\n')

  console.log('1. Logging in...')
  const token = await login()
  console.log('✅ Login successful\n')

  console.log('2. Testing campaigns query...')
  const duration = await testCampaignsQuery(token)

  console.log(`\n🎯 Total time: ${duration}ms`)
}

main().catch(console.error)
