// eslint-disable-next-line import/no-extraneous-dependencies
import css from 'css';

describe('less', () => {
  let result;
  before(async function () {
    this.timeout(120000);
    result = await pack(__dirname, '');
  });

  it('resolves a compless less structure', async () => {
    const files = await result('stats.json');
    expect(files).to.have.lengthOf(1);
  });

  it('inlines small images', async () => {
    const images = await result('**/*.png');
    expect(images).to.have.lengthOf(1);
  });

  it('prefixes css if needed', async () => {
    const [{ content }] = await result('**/*.css');
    const cssAST = css.parse(content);
    const flex = cssAST.stylesheet.rules.find(
      rule => rule.selectors.some(selector => selector === '.flex'),
    );
    expect(flex).to.be.an('object');
    const displayDeclarations = flex.declarations.filter(
      declaration => declaration.property === 'display',
    );
    expect(displayDeclarations.length).to.be.at.least(4);
  });

  it('fails the unit tests', async function () {
    this.timeout(120000);
    const testResult = await packTest(__dirname, '');
    expect(testResult).to.equal(false);
  });
});
