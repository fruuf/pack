
describe('react + sass', () => {
  it('bundles react apps with sass and relative / absolute imports', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '-r');
    expect(result).to.be.an('object');
  });
  it('runs the unit tests', async function () {
    this.timeout(120000);
    const result = await packTest(__dirname, '-r');
    expect(result).to.equal(true);
  });
});
