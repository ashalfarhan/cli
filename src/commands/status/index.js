const Command = require('@netlify/cli-utils')
const prettyjson = require('prettyjson')
const get = require('lodash.get')
const chalk = require('chalk')
const clean = require('clean-deep')

class StatusCommand extends Command {
  async run() {
    const { globalConfig, api, site } = this.netlify
    const { flags } = this.parse(StatusCommand)
    const current = globalConfig.get('userId')
    const [ accessToken ] = this.getConfigToken()

    if (!accessToken) {
      this.log(`Not logged in. Please log in to see site status.`)
      this.log()
      this.log('Login with "netlify login" command')
      this.exit()
    }

    const siteId = site.id

    this.log(`──────────────────────┐
 Current Netlify User │
──────────────────────┘`)
    let accountData
    const accounts = await api.listAccountsForUser()
    const user = await this.netlify.api.getCurrentUser()

    const ghuser = this.netlify.globalConfig.get(`users.${current}.auth.github.user`)
    accountData = {
      Name: get(user, 'full_name'),
      // 'Account slug': get(personal, 'slug'),
      // 'Account id': get(personal, 'id'),
      // Name: get(personal, 'billing_name'),
      Email: get(user, 'email'),
      Github: ghuser
    }
    const teamsData = {}

    accounts.forEach(team => {
      return (teamsData[team.name] = team.roles_allowed.join(' '))
    })

    accountData.Teams = teamsData

    const cleanAccountData = clean(accountData)

    this.log(prettyjson.render(cleanAccountData))

    if (!site.configPath) {
      this.logJson({
        account: cleanAccountData
      })
      this.exit()
    }

    this.log(`────────────────────┐
 Netlify Site Info  │
────────────────────┘`)

    if (!siteId) {
      this.warn('Did you run `netlify link` yet?')
      this.error(`You don't appear to be in a folder that is linked to a site`)
    }
    let siteData
    try {
      siteData = await api.getSite({ siteId })
    } catch (e) {
      if (e.status === 401 /* unauthorized*/) {
        this.warn(`Log in with a different account or re-link to a site you have permission for`)
        this.error(`Not authorized to view the currently linked site (${siteId})`)
      }
      if (e.status === 404 /* missing */) {
        this.error(`The site this folder is linked to can't be found`)
      }
      this.error(e)
    }

    const statusData = {
      'Current site': `${siteData.name}`,
      'Netlify TOML': site.configPath,
      'Admin URL': chalk.magentaBright(siteData.admin_url),
      'Site URL': chalk.cyanBright(siteData.ssl_url || siteData.url)
    }

    // Json only logs out if --json flag is passed
    this.logJson({
      account: cleanAccountData,
      siteData: statusData,
    })

    this.log(prettyjson.render(statusData))
  }
}

StatusCommand.description = `Print status information`

module.exports = StatusCommand
