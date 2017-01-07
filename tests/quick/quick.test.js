describe('quick-mode', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '-q quick.js');
  });

  it('creates a bundle', async () => {
    const files = await result('*.js');
    expect(files).to.have.lengthOf(1);
  });

  it('creates a html entry', async () => {
    const files = await result('*.html');
    expect(files).to.have.lengthOf(1);
  });
});
