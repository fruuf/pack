describe('babel features', () => {
  it('bundles app with babel language features', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '');
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('passes its unit tests', async function () {
    this.timeout(120000);
    const result = await packTest(__dirname, '');
    expect(result).to.equal(true);
  });
});
