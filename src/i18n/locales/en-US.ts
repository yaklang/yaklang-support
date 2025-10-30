export const enUS = {
    // Common
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.restart': 'Restart',
    'common.later': 'Later',
    'common.download': 'Download',
    'common.viewLog': 'View Log',
    'common.openLog': 'Open Log',
    'common.checking': 'Checking...',
    'common.version': 'Version',
    'common.status': 'Status',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',
    'common.path': 'Path',
    'common.currentPath': 'Current Path',
    'common.reason': 'Reason',
    'common.solution': 'Solution',
    
    // Status Bar
    'statusbar.checking': 'YAK: Checking...',
    'statusbar.checkingTooltip': 'Checking Yak engine status...',
    'statusbar.failed': 'YAK: Failed',
    'statusbar.binaryMode': 'Binary Mode',
    'statusbar.autoMode': 'Auto (System PATH)',
    'statusbar.customMode': 'Custom Path',
    'statusbar.failedTooltip': 'Yak engine status check failed',
    'statusbar.notFound': 'Yak binary not found',
    'statusbar.tryingPath': 'Attempting to use path',
    'statusbar.clickToFix': 'Click to see how to fix',
    
    // LSP Status Bar
    'lsp.statusbar.starting': 'YAK LSP: Starting...',
    'lsp.statusbar.startingTooltip': 'Starting YAK LSP HTTP server...',
    'lsp.statusbar.active': 'YAK LSP: Active',
    'lsp.statusbar.activeTooltip': 'YAK LSP HTTP server is running\nClick for details',
    'lsp.statusbar.inactive': 'YAK LSP: Inactive',
    'lsp.statusbar.inactiveTooltip': 'LSP inactive, using static completion\nClick for details',
    'lsp.statusbar.error': 'YAK LSP: Error',
    'lsp.statusbar.errorTooltip': 'LSP startup failed\nClick for details',
    
    // LSP Messages
    'lsp.starting': 'Starting YAK LSP HTTP failed: {0}',
    'lsp.failed': 'Failed to start YAK LSP HTTP: {0}',
    'lsp.abnormalExit': 'YAK LSP server exited abnormally (code: {0})',
    'lsp.notFound': 'No YAK LSP service: yak binary not found',
    'lsp.restarting': 'Restarting YAK LSP server...',
    'lsp.startupFailed': 'YAK LSP startup failed',
    'lsp.alreadyRunning': 'YAK LSP server is already running',
    'lsp.loadSuccess': 'YAK LSP HTTP loaded successfully',
    'lsp.startupWarning': 'YAK LSP startup failed, using static completion as fallback',
    
    // LSP Status Dialog
    'lsp.status.running': 'YAK LSP HTTP server is running\n\nService URL: http://127.0.0.1:9339\nStatus: Active\nCompletion Mode: LSP Dynamic Completion',
    'lsp.status.notRunning': 'YAK LSP Inactive\n\nCurrent: Static Completion (Limited)\n\nSuggestions:\n1. Check developer console logs\n2. Verify yak command is available\n3. Check if port 9339 is occupied',
    
    // LSP Diagnostics
    'lsp.diagnostic.portInUse': '❌ Port {0} is in use',
    'lsp.diagnostic.portInUseSolution': '   Solution: Close the program using the port or restart LSP server',
    'lsp.diagnostic.portAvailable': '✓ Port {0} is available',
    'lsp.diagnostic.engineAbnormal': '❌ YAK engine status abnormal',
    'lsp.diagnostic.engineReason': '   Reason: {0}',
    'lsp.diagnostic.engineSolution': '   Solution: Check YAK engine installation',
    'lsp.diagnostic.engineNormal': '✓ YAK engine status normal (version: {0})',
    'lsp.diagnostic.versionOld': '⚠️  YAK engine version is too old ({0})',
    'lsp.diagnostic.versionRequired': '   LSP HTTP server requires YAK 1.3.0 or higher',
    'lsp.diagnostic.updateSolution': '   Solution: Update YAK engine to the latest version',
    
    // Static Completion
    'completion.warning': 'LSP completion not enabled, using static completion (limited features)',
    'completion.features': 'Static completion features:',
    'completion.supportLibName': '  - Support: Standard library name completion',
    'completion.supportLibFunc': '  - Support: Standard library function completion',
    'completion.limitedMethod': '  - Limited: Object method completion (limited)',
    'completion.noTypeInfer': '  - No Support: Real-time type inference',
    'completion.checkLsp': 'Suggestion: Check if LSP server is running properly',
    
    // Configuration
    'config.updated': 'Yak binary configuration updated, restarting LSP server...\nCurrent path: {0}',
    
    // Engine Download
    'engine.download.noVersions': 'Unable to get available Yak engine versions',
    'engine.download.selectVersion': 'Select Yak engine version to download',
    'engine.download.latest': 'Latest',
    'engine.download.versionLabel': 'Version: {0}',
    'engine.download.restartPrompt': 'Restart LSP server to use the new engine?',
    'engine.download.failed': 'Failed to download Yak engine: {0}',
    'engine.download.noInstalled': 'No installed Yak engine versions found',
    'engine.download.installedVersions': 'Installed versions (current: {0})',
    'engine.download.getInstalledFailed': 'Failed to get installed versions: {0}',
    'engine.download.downloadingVersion': 'Downloading Yak engine version {0}...',
    'engine.download.detectingOS': 'Detecting operating system...',
    'engine.download.downloadURL': 'Download URL: {0}',
    'engine.download.downloading': 'Downloading: {0}',
    'engine.download.downloaded': 'Downloaded: {0} / {1} ({2}%)',
    'engine.download.extracting': 'Extracting...',
    'engine.download.settingPermissions': 'Setting executable permissions...',
    'engine.download.createSymlink': 'Creating symbolic link...',
    'engine.download.success': 'Yak engine {0} downloaded successfully!\nInstall path: {1}',
    'engine.download.alreadyExists': 'Yak engine version {0} already exists\nPath: {1}\nRedownload?',
    'engine.download.redownload': 'Redownload',
    'engine.download.useExisting': 'Use Existing',
    'engine.download.unsupportedPlatform': 'Unsupported platform: {0}',
    
    // Commands
    'command.cannotFindWorkspace': "Can't find workspace folder",
    'command.cannotFindYak': 'Cannot find yak in PATH',
    'command.selectYakBinary': 'Select Yak Binary',
    'command.chooseFromBrowser': 'Choose yak binary from file browser',
    'command.downloadLatest': 'Download latest yak binary',
    'command.downloadSpecific': 'Download specific version',
    'command.clearSelection': 'Clear yak binary selection',
    'command.useSystemPath': 'Use yak from system PATH (auto mode)',
    'command.switchedToAuto': 'Switched to auto mode, will use yak from system PATH',
    'command.switchedToCustom': 'Switched to custom mode',
    'command.clearedSelection': 'Cleared yak binary selection, will use system PATH',
    
    // Language Switch
    'lang.current': 'Current Language',
    'lang.selectLanguage': 'Select Interface Language',
    'lang.switchSuccess': 'Language switched to {0}',
    'lang.reloadPrompt': 'Window reload required for language change to take full effect',
    'lang.reloadNow': 'Reload Now',
    'lang.reloadLater': 'Later',
    'lang.zhCN': '简体中文',
    'lang.enUS': 'English',
    
    // Status bar menu options
    'menu.switchLanguage': 'Switch Language / 切换语言',
    'menu.useSystemPath': 'Use yak from system PATH (auto mode)',
    'menu.chooseFromBrowser': 'Choose yak binary from file browser',
    'menu.downloadLatest': 'Download latest yak binary',
    'menu.downloadSpecific': 'Download specific version',
    'menu.clearSelection': 'Clear yak binary selection',

    // CodeLens related
    'codeLens.runScript': 'Run Yak Script',
    'codeLens.debugScript': 'Debug Yak Script',
    'codeLens.runFunction': 'Run Function {0}',
    'codeLens.runMain': 'Run main Function',
} as const;

