
describe('env', () => {
  it('inlines environment variables', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '');
    expect(result).to.be.an('object');
  });
});
