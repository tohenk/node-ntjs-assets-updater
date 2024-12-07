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

const fs = require('fs');
const path = require('path');

class Package {

    /**
     * Constructor.
     *
     * @param {string} dir Package directory
     */
    constructor(dir = null) {
        this.dir = dir || __dirname;
        const metadata = this.loadJson('package.json');
        this.assets = metadata.assets || {};
        this.cdn = metadata.cdn || {};
        this.installed = this.loadJson('package-lock.json');
    }

    /**
     * Load package and parse as JSON.
     *
     * @param {string} pkg Package name
     * @returns {object}
     */
    loadJson(pkg) {
        return JSON.parse(fs.readFileSync(path.join(this.dir, pkg)));
    }

    /**
     * Get installed packages.
     *
     * @returns {object}
     */
    getPackages() {
        if (!this.packages) {
            this.packages = {};
            if (this.installed.packages) {
                const modulesRoot = 'node_modules/';
                Object.keys(this.installed.packages).forEach(pkg => {
                    const pkgInfo = this.installed.packages[pkg];
                    if (pkg.startsWith(modulesRoot)) {
                        pkg = pkg.substr(modulesRoot.length);
                    }
                    this.packages[pkg] = pkgInfo;
                });
            }
        }
        return this.packages;
    }

    /**
     * Get package version.
     *
     * @param {string} pkg Package name
     * @returns {string}
     */
    getVersion(pkg) {
        const packages = this.getPackages();
        if (packages[pkg] && packages[pkg].version) {
            return packages[pkg].version;
        }
    }
}

module.exports = Package;