/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2024 Toha <tohenk@yahoo.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const assert = require('node:assert');
const test = require('node:test');
const promisify = require('node:util').promisify;
const exec = promisify(require('child_process').exec);
const App = require('.');

const app = new App();

test('app package', async (t) => {
    await t.test('can load package information', () => {
        assert.strictEqual(app.pkg.dir, __dirname);
        assert.notStrictEqual(app.pkg.assets, undefined);
        assert.notStrictEqual(app.pkg.cdn, undefined);
        assert.notStrictEqual(app.pkg.installed, undefined);
    });
    await t.test('can ignores file', () => {
        assert.strictEqual(app.isIgnored('bower.json', app.ignores), true);
        assert.strictEqual(app.isIgnored('composer.json', app.ignores), true);
        assert.strictEqual(app.isIgnored('package.json', app.ignores), true);
    });
});
test('package version', async (t) => {
    await t.test('can get version of package without configuration', async () => {
        const {stdout, stderr} = await exec('node ver.js bootstrap');
        if (stderr) {
            assert.fail(stderr);
        } else {
            assert.notEqual(stdout.length, 0);
        }
    });
    await t.test('can get version of package with package name', async () => {
        const {stdout, stderr} = await exec('node ver.js bootstrap-datetimepicker');
        if (stderr) {
            assert.fail(stderr);
        } else {
            assert.notEqual(stdout.length, 0);
        }
    });
    await t.test('can get version of package without package name', async () => {
        const {stdout, stderr} = await exec('node ver.js highcharts');
        if (stderr) {
            assert.fail(stderr);
        } else {
            assert.notEqual(stdout.length, 0);
        }
    });
    await t.test('can get version of package contains sub packages', async () => {
        const {stdout, stderr} = await exec('node ver.js DataTables');
        if (stderr) {
            assert.fail(stderr);
        } else {
            assert.notEqual(stdout.length, 0);
        }
    });
    await t.test('can get version of sub package', async () => {
        const {stdout, stderr} = await exec('node ver.js DataTables-Responsive');
        if (stderr) {
            assert.fail(stderr);
        } else {
            assert.notEqual(stdout.length, 0);
        }
    });
});
