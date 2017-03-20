// eslint-disable-next-line import/no-extraneous-dependencies
import css from 'css';

describe('build react / sass', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '');
  });

  it('bundles react apps with sass and relative / absolute imports', async () => {
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('uses react lite in production build', async () => {
    const [{ content }] = await result('stats.json');
    const stats = JSON.parse(content);
    const names = stats.modules.map(module => module.name);
    expect(names).to.not.include.something.to.match(/react-dom/);
    expect(names).to.include.something.to.match(/react-lite/);
  });

  it('inlines the image', async () => {
    const files = await result('**/*.png');
    expect(files).to.have.lengthOf(0);
  });

  it('generates one css file', async () => {
    const files = await result('**/*.css');
    expect(files).to.have.lengthOf(1);
  });

  it('allows to bypass css modules', async () => {
    const [{ content }] = await result('**/*.css');
    const cssAST = css.parse(content);
    const selectors = cssAST.stylesheet.rules.reduce((acc, rule) => acc.concat(rule.selectors), []);
    expect(selectors).to.not.include.something.to.match(/\.(app|message)$/i);
    expect(selectors).to.include.something.to.match(/global-class/);
  });

  it('has browser as a build target environment variable', async () => {
    const [{ content }] = await result('**/bundle.js');
    expect(content).not.to.contain('BUILD_TARGET_NODE');
    expect(content).to.contain('BUILD_TARGET_BROWSER');
  });
});

describe('test react / sass', () => {
  it('unit tests pass', async function () {
    this.timeout(120000);
    const result = await packTest(__dirname, '-r');
    expect(result).to.equal(true);
  });
});
