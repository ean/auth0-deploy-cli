import nconf from 'nconf';
import configFactory from '../configFactory';
import { deploy as toolsDeploy } from '../tools';
import log from '../logger';
import setupContext from '../context';

type ImportParams = {
  input_file: string,
  base_path: string,
  config_file: string,
  env: boolean,
  secret: string,
  config: {
    AUTH0_CLIENT_SECRET: string
  },
}

export default async function importCMD(params:ImportParams) {
  const {
    input_file: inputFile,
    base_path: basePath,
    config_file: configFile,
    config: configObj,
    env: shouldInheritEnv = false,
    secret: clientSecret
  } = params;

  if(shouldInheritEnv){
    nconf.env().use('memory');

    const mappings = nconf.get('AUTH0_KEYWORD_REPLACE_MAPPINGS') || {};
    nconf.set('AUTH0_KEYWORD_REPLACE_MAPPINGS', Object.assign(mappings, process.env));
  }

  if (configFile) {
    nconf.file(configFile);
  }

  const overrides = {
    AUTH0_INPUT_FILE: inputFile,
    AUTH0_BASE_PATH: basePath,
    AUTH0_CONFIG_FILE: configFile,
    AUTH0_KEYWORD_REPLACE_MAPPINGS: {},
    ...configObj || {}
  };

  // Prepare configuration by initializing nconf, then passing that as the provider to the config object
  // Allow passed in secret to override the configured one
  if (clientSecret) {
    overrides.AUTH0_CLIENT_SECRET = clientSecret;
  }

  nconf.overrides(overrides);

  // Setup context and load
  const context = await setupContext(nconf.get());
  await context.load();

  const config = configFactory();
  config.setProvider((key) => nconf.get(key));

  await toolsDeploy(context.assets, context.mgmtClient, config);

  log.info('Import Successful');
}
