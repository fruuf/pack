
describe('babel features', () => {
  it('bundles app with babel language features', async function () {
    this.timeout(60000);
    const result = await pack(__dirname, '');
    expect(result).to.be.an('object');
  });
});
