
describe('babel features', () => {
  it('bundles app with babel language features', async function () {
    this.timeout(60000);
    const result = await pack(__dirname, '');
    expect(result).to.be.an('object');
  });
  it('passes its unit tests', async function () {
    this.timeout(60000);
    const result = await packTest(__dirname, '');
    expect(result).to.equal(true);
  });
});
