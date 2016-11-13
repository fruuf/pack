
describe('react + sass', () => {
  it('bundles react apps with sass and relative / absolute imports', async function runTest() {
    this.timeout(60000);
    const result = await pack(__dirname, '-r');
    expect(result).to.be.an('object');
  });
});
