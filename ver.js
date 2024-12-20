/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2023-2024 Toha <tohenk@yahoo.com>
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

if (process.argv.length > 2) {
    const args = process.argv.slice(2);
    const Package = require('./pkg');
    const pkg = new Package();
    // get asset information
    let pkgname = args[0];
    let info = pkg.assets[pkgname];
    if (typeof info === 'object' &&
        Object.keys(info).length > 0 &&
        info.name === undefined &&
        info.packages) {
        info = undefined;
    }
    if (!info) {
        for (const subpkg of Object.values(pkg.assets)) {
            if (subpkg.packages && subpkg.packages[pkgname]) {
                info = subpkg.packages[pkgname];
                break;
            }
        }
    }
    if (info) {
        pkgname = info.name ? info.name : pkgname;
        const version = pkg.getVersion(Array.isArray(pkgname) ? pkgname[0] : pkgname);
        if (version !== undefined) {
            console.log(version);
        }
    }
}
