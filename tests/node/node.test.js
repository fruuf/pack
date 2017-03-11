describe('build target node', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '-n');
  });

  it('bundles nodeJS app', async () => {
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('doesnt bundle external modules', async () => {
    const [{ content }] = await result('stats.json');
    const stats = JSON.parse(content);
    const names = stats.modules.map(module => module.name);
    expect(names).to.include.something.to.match(/external.*glob/);
  });

  it('has node as a build target environment variable', async () => {
    const [{ content }] = await result('**/bundle.js');
    expect(content).to.contain('BUILD_TARGET_NODE');
    expect(content).not.to.contain('BUILD_TARGET_BROWSER');
  });
});
