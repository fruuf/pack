
describe('less', () => {
  it('resolves a compless less structure', async function () {
    this.timeout(60000);
    const result = await pack(__dirname, '');
    expect(result).to.be.an('object');
  });
});
