
describe('less', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '');
  });

  it('resolves a compless less structure', async () => {
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('inlines small images', async () => {
    const images = await result('**/*.png');
    expect(images).to.have.lengthOf(1);
  });

  it('fails the unit tests', async function () {
    this.timeout(120000);
    const testResult = await packTest(__dirname, '');
    expect(testResult).to.equal(false);
  });
});
