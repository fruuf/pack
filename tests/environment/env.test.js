describe('env', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '--env .env');
  });

  it('builds project', async () => {
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('replaces placeholders', async () => {
    const [{ content }] = await result('**/*.js');
    expect(content).to.contain('UNIQID2');
  });
});
