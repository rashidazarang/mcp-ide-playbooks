#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🚀 MCP IDE Setup Wizard                            ║
║     Transform your IDE into an AI powerhouse            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

class MCPIDESetup {
  constructor() {
    this.config = {};
    this.spinner = ora();
  }

  async run() {
    console.clear();
    console.log(chalk.cyan(banner));
    
    // Quick mode for CLI flags
    if (program.opts().vscode && program.opts().claude) {
      this.config = {
        ide: 'vscode',
        ai: 'claude',
        useCase: 'web'
      };
      await this.install();
      return;
    }
    
    // Interactive mode
    await this.detectEnvironment();
    await this.askQuestions();
    await this.install();
    await this.verify();
    await this.showNextSteps();
  }
  
  async detectEnvironment() {
    this.spinner.start('Detecting environment...');
    
    // Detect installed IDEs
    const detectedIDEs = [];
    
    try {
      execSync('code --version', { stdio: 'ignore' });
      detectedIDEs.push('VS Code');
    } catch {}
    
    try {
      execSync('idea --version', { stdio: 'ignore' });
      detectedIDEs.push('IntelliJ IDEA');
    } catch {}
    
    try {
      execSync('cursor --version', { stdio: 'ignore' });
      detectedIDEs.push('Cursor');
    } catch {}
    
    // Detect Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    this.spinner.succeed('Environment detected');
    
    if (majorVersion < 18) {
      console.log(chalk.red(`⚠️  Node.js 18+ required (you have ${nodeVersion})`));
      process.exit(1);
    }
    
    if (detectedIDEs.length > 0) {
      console.log(chalk.green(`✓ Found: ${detectedIDEs.join(', ')}`));
      this.detectedIDEs = detectedIDEs;
    }
  }
  
  async askQuestions() {
    const questions = [
      {
        type: 'list',
        name: 'ide',
        message: 'Which IDE are you using?',
        choices: [
          { name: '📝 VS Code', value: 'vscode' },
          { name: '🧠 JetBrains (IntelliJ/WebStorm/PyCharm)', value: 'jetbrains' },
          { name: '🎯 Cursor', value: 'cursor' },
          { name: '🌙 Eclipse', value: 'eclipse' },
          { name: '🍎 Xcode', value: 'xcode' },
          { name: '⌨️  Neovim', value: 'neovim' }
        ],
        default: this.detectedIDEs?.[0]?.toLowerCase().includes('code') ? 'vscode' : 'vscode'
      },
      {
        type: 'list',
        name: 'ai',
        message: 'Which AI assistant do you want to use?',
        choices: [
          { name: '🤖 Claude (Anthropic)', value: 'claude' },
          { name: '🐙 GitHub Copilot', value: 'copilot' },
          { name: '🔄 Both', value: 'both' },
          { name: '🎯 Cursor AI (if using Cursor)', value: 'cursor-ai' }
        ]
      },
      {
        type: 'list',
        name: 'useCase',
        message: "What's your primary use case?",
        choices: [
          { name: '🌐 Web Development', value: 'web' },
          { name: '📊 Data Science', value: 'data' },
          { name: '📱 Mobile Development', value: 'mobile' },
          { name: '🏢 Enterprise Applications', value: 'enterprise' },
          { name: '🎮 Game Development', value: 'game' },
          { name: '🤖 AI/ML Development', value: 'ai' }
        ]
      },
      {
        type: 'confirm',
        name: 'installGlobal',
        message: 'Install MCP Intelligence globally?',
        default: true
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your Claude API key (or press Enter to skip):',
        when: (answers) => answers.ai === 'claude' || answers.ai === 'both',
        validate: (input) => {
          if (!input) return true; // Allow skipping
          if (input.startsWith('sk-ant-')) return true;
          return 'Invalid API key format (should start with sk-ant-)';
        }
      }
    ];
    
    this.config = await inquirer.prompt(questions);
  }
  
  async install() {
    console.log('\n' + chalk.cyan.bold('📦 Installing components...\n'));
    
    const steps = [
      { name: 'Install MCP Intelligence', fn: () => this.installMCPIntelligence() },
      { name: 'Install IDE Extensions', fn: () => this.installIDEExtensions() },
      { name: 'Configure Settings', fn: () => this.configureSettings() },
      { name: 'Set up API Keys', fn: () => this.setupAPIKeys() },
      { name: 'Create Sample Project', fn: () => this.createSampleProject() }
    ];
    
    for (const step of steps) {
      this.spinner.start(step.name);
      try {
        await step.fn();
        this.spinner.succeed(step.name);
      } catch (error) {
        this.spinner.fail(step.name);
        console.error(chalk.red(`  Error: ${error.message}`));
        
        const { continueAnyway } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAnyway',
            message: 'Continue anyway?',
            default: true
          }
        ]);
        
        if (!continueAnyway) {
          process.exit(1);
        }
      }
    }
  }
  
  async installMCPIntelligence() {
    if (this.config.installGlobal) {
      execSync('npm install -g @mcp-intelligence/core @mcp-intelligence/cli', {
        stdio: 'ignore'
      });
    } else {
      // Install locally in current directory
      execSync('npm install @mcp-intelligence/core @mcp-intelligence/cli', {
        stdio: 'ignore'
      });
    }
  }
  
  async installIDEExtensions() {
    const { ide, ai } = this.config;
    
    switch (ide) {
      case 'vscode':
        // Install VS Code extensions
        const extensions = [
          'mcp.mcp-intelligence'
        ];
        
        if (ai === 'claude' || ai === 'both') {
          extensions.push('Anthropic.claude-vscode');
        }
        
        if (ai === 'copilot' || ai === 'both') {
          extensions.push('GitHub.copilot');
        }
        
        for (const ext of extensions) {
          try {
            execSync(`code --install-extension ${ext}`, { stdio: 'ignore' });
          } catch {
            // Extension might already be installed
          }
        }
        break;
        
      case 'jetbrains':
        console.log(chalk.yellow('\n  ℹ️  Please install JetBrains plugins manually:'));
        console.log('     1. Open your JetBrains IDE');
        console.log('     2. Go to Settings → Plugins');
        console.log('     3. Search for "MCP Intelligence"');
        console.log('     4. Click Install\n');
        break;
        
      case 'cursor':
        console.log(chalk.green('  ✓ Cursor has built-in AI support'));
        break;
    }
  }
  
  async configureSettings() {
    const { ide, useCase } = this.config;
    
    // Create configuration based on IDE and use case
    const config = {
      mcp: {
        intelligence: {
          enabled: true,
          mode: useCase === 'enterprise' ? 'accuracy' : 'balanced',
          routing: 'semantic',
          caching: true
        },
        servers: this.getMCPServers(useCase)
      }
    };
    
    // Write configuration
    const configPath = await this.getConfigPath(ide);
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
  
  async setupAPIKeys() {
    const { apiKey, ai } = this.config;
    
    if (!apiKey) {
      console.log(chalk.yellow('\n  ⚠️  Remember to add your API key later'));
      return;
    }
    
    // Store API key securely
    const configDir = path.join(os.homedir(), '.mcp-intelligence');
    await fs.mkdir(configDir, { recursive: true });
    
    const credentials = {
      claude: ai === 'claude' || ai === 'both' ? apiKey : null,
      github: null // User can add later
    };
    
    await fs.writeFile(
      path.join(configDir, 'credentials.json'),
      JSON.stringify(credentials, null, 2)
    );
    
    // Set permissions to read-only for user
    await fs.chmod(path.join(configDir, 'credentials.json'), 0o600);
  }
  
  async createSampleProject() {
    const { useCase } = this.config;
    
    // Create a sample file to test with
    const samples = {
      web: `// test.js - Try pressing Ctrl+Enter after this comment
// TODO: Create a React component that fetches and displays user data

`,
      data: `# test.py - Try asking Claude to help with this
# TODO: Load a CSV file and create visualizations

`,
      mobile: `// test.swift - Try Copilot suggestions here
// TODO: Create a SwiftUI view with a list

`
    };
    
    const sample = samples[useCase] || samples.web;
    await fs.writeFile('mcp-test-file.js', sample);
  }
  
  async verify() {
    console.log('\n' + chalk.cyan.bold('🔍 Verifying installation...\n'));
    
    this.spinner.start('Running health check');
    
    try {
      const result = execSync('mcp-ide health-check', { encoding: 'utf8' });
      this.spinner.succeed('Health check passed');
      
      // Parse and display results
      console.log(chalk.green('\n✅ All systems operational!'));
    } catch (error) {
      this.spinner.warn('Health check needs attention');
      console.log(chalk.yellow('\n⚠️  Some components need configuration'));
      console.log('  Run `mcp-ide health-check` for details');
    }
  }
  
  async showNextSteps() {
    const { ide, ai } = this.config;
    
    console.log('\n' + chalk.green.bold('🎉 Setup Complete!\n'));
    
    console.log(chalk.cyan('Next steps:'));
    console.log('1. Open your IDE');
    
    if (ide === 'vscode') {
      console.log('2. Open the test file: ' + chalk.white('code mcp-test-file.js'));
      console.log('3. Try the shortcuts:');
      console.log('   • ' + chalk.white('Ctrl+Enter') + ' - Ask Claude');
      console.log('   • ' + chalk.white('Ctrl+Shift+E') + ' - Explain code');
      console.log('   • ' + chalk.white('Ctrl+Shift+R') + ' - Refactor');
    }
    
    console.log('\n' + chalk.gray('Resources:'));
    console.log('• Documentation: https://github.com/rashidazarang/mcp-ide-playbooks');
    console.log('• Discord: https://discord.gg/mcp-intelligence');
    console.log('• Issues: https://github.com/rashidazarang/mcp-ide-playbooks/issues');
    
    console.log('\n' + chalk.magenta('💡 Tip: Run `mcp-ide metrics` to see your performance gains!'));
  }
  
  getMCPServers(useCase) {
    const servers = {
      web: [
        { name: 'filesystem', type: 'fs', path: './' },
        { name: 'npm', type: 'package', manager: 'npm' },
        { name: 'git', type: 'git', repo: './' }
      ],
      data: [
        { name: 'jupyter', type: 'jupyter', notebooks: './' },
        { name: 'database', type: 'sql', connection: 'sqlite:///data.db' },
        { name: 'filesystem', type: 'fs', path: './' }
      ],
      enterprise: [
        { name: 'jira', type: 'jira', url: process.env.JIRA_URL },
        { name: 'confluence', type: 'confluence', url: process.env.CONFLUENCE_URL },
        { name: 'git', type: 'git', repo: './' }
      ]
    };
    
    return servers[useCase] || servers.web;
  }
  
  async getConfigPath(ide) {
    switch (ide) {
      case 'vscode':
        return '.vscode/mcp-config.json';
      case 'jetbrains':
        return '.idea/mcp-config.json';
      case 'cursor':
        return '.cursor/mcp-config.json';
      default:
        return '.mcp/config.json';
    }
  }
}

// CLI setup
program
  .name('create-mcp-ide')
  .description('Interactive setup wizard for MCP Intelligence IDE integration')
  .version('1.0.0')
  .option('--vscode', 'Quick setup for VS Code')
  .option('--claude', 'Use Claude AI')
  .option('--copilot', 'Use GitHub Copilot')
  .parse(process.argv);

// Run the setup
const setup = new MCPIDESetup();
setup.run().catch(error => {
  console.error(chalk.red('\n❌ Setup failed:'), error.message);
  process.exit(1);
});