
describe('cli features', () => {
  it('flattens output', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '--flatten');
    const filenames = (await result('**')).map(file => file.name);
    expect(filenames).to.have.lengthOf(5);
    expect(filenames).to.include('bundle.js');
    expect(filenames).to.include('bundle.js.map');
    expect(filenames).to.include('bundle.css');
    expect(filenames).to.include('bundle.css.map');
    expect(filenames).to.include('stats.json');
  });

  it('builds in quick mode', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '-q src/main.js');

    const scriptFilenames = (await result('**/*.js')).map(file => file.name);
    const styleFilenames = (await result('**/*.css')).map(file => file.name);
    const htmlFilenames = (await result('**/*.html')).map(file => file.name);

    expect(scriptFilenames).to.have.lengthOf(1);
    expect(scriptFilenames).to.include('bundle.js');

    expect(styleFilenames).to.have.lengthOf(1);
    expect(styleFilenames).to.include('bundle.css');

    expect(htmlFilenames).to.have.lengthOf(1);
    expect(htmlFilenames).to.include('index.html');
  });

  it('allows changing default folders', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '-s client -m app -b app -d build', { root: 'build' });

    const scriptFilenames = (await result('**/*.js')).map(file => file.name);
    const styleFilenames = (await result('**/*.css')).map(file => file.name);

    expect(scriptFilenames).to.have.lengthOf(1);
    expect(scriptFilenames).to.include('js/app.js');

    expect(styleFilenames).to.have.lengthOf(0);
  });

  it('initialises project', async function () {
    this.timeout(120000);
    const result = await pack(__dirname, '-rlc --flatten --init', { copy: false, root: '.' });
    const checkJson = async (glob, fn) => {
      const files = await result(glob);
      if (files.length !== 1) throw new Error(`found ${files.length} files for ${glob} but expected 1`);
      const [{ content }] = files;
      const data = JSON.parse(content);
      return fn(data);
    };

    expect(await result('src/*.js')).to.have.lengthOf(2);

    await checkJson('package.json', (data) => {
      expect(data).to.be.an('object');
      expect(data).to.have.keys(['scripts', 'dependencies', 'devDependencies']);
      expect(data.dependencies.react).to.be.a('string');
    });

    await checkJson('.eslintrc', (data) => {
      expect(data).to.be.an('object');
      expect(data).to.have.keys(['globals', 'parser', 'extends', 'parserOptions', 'rules', 'env']);
      expect(data.globals.mount).to.equal(true);
    });

    await checkJson('src/pack.json', (data) => {
      expect(data).to.be.an('object');
      expect(data).to.have.keys(['react', 'flatten', 'lite', 'cssmodules']);
      expect(data.react).to.equal(true);
      expect(data.flatten).to.equal(true);
      expect(data.lite).to.equal(true);
      expect(data.cssmodules).to.equal(true);
    });
  });
});
