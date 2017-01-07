describe('coffee-script', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '');
  });

  it('bundles a coffeescript / jade application', async () => {
    const files = await result('**/*.js');
    expect(files).to.have.lengthOf(1);
  });
});
