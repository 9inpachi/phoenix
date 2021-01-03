module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    files: [
      { pattern: 'src/**/*.ts' },
      { pattern: 'src/assets/**/*', watched: false, included: false, served: true }
    ],
    proxies: {
      '/assets/': '/base/src/assets/'
    },
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },
    reporters: ['dots', 'karma-typescript'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    karmaTypescriptConfig: {
      include: ['src'],
      reports: {
        html: {
          directory: 'coverage',
          subdirectory: 'phoenix-event-display'
        }
      },
      compilerOptions: {
        module: 'commonjs',
        esModuleInterop: true
      },
      bundlerOptions: {
        transforms: [
          require('karma-typescript-es6-transform')()
        ]
      }
    }
  });
};
