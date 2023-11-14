/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2023 Toha <tohenk@yahoo.com>
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

class App {

    ignores = ['bower.json', 'composer.json', 'package.json']

    constructor() {
        this.package = this.loadJson('package.json');
        this.installed = this.loadJson('package-lock.json');
    }

    /**
     * Load package and parse as JSON.
     *
     * @param {string} pkg Package name
     * @returns {object}
     */
    loadJson(pkg) {
        return JSON.parse(fs.readFileSync(path.join(__dirname, pkg)));
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
                Object.keys(this.installed.packages).forEach(pkg => {
                    const pkgInfo = this.installed.packages[pkg];
                    if ('node_modules/' === pkg.substr(0, 13)) {
                        pkg = pkg.substr(13);
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

    /**
     * Check if filename is ignored. The check performed by comparing
     * filename directly or using wildcard *.
     *
     * @param {string} filename Filename to check
     * @param {string[]} ignores Filename or pattern for ignores
     * @returns {boolean}
     */
    isIgnored(filename, ignores = []) {
        if (ignores.indexOf(filename) >= 0) {
            return true;
        }
        for (let i = 0; i < ignores.length; i++) {
            if (ignores[i].indexOf('*') >= 0) {
                const pattern = ignores[i]
                    .replace(/\./g, '\\.')
                    .replace(/\-/g, '\\-')
                    .replace(/\*/g, '(.*)');
                if (filename.match(pattern)) {
                    return true;
                }
            }
        }
    }

    /**
     * Download a file from url.
     *
     * @param {string} url File url
     * @returns {Promise<string>}
     */
    downloadFile(url) {
        return new Promise((resolve, reject) => {
            let done = false;
            const d = () => {
                let buff, err, code;
                const parsedUrl = require('url').parse(url);
                const http = require('https:' == parsedUrl.protocol ? 'https' : 'http');
                const req = http.get(url, res => {
                    code = res.statusCode;
                    res.setEncoding('utf8');
                    res.on('data', chunk => {
                        if (buff) {
                            buff += chunk;
                        } else {
                            buff = chunk;
                        }
                    });
                    res.on('end', () => {
                        if (code === 301 || code === 302) {
                            if (res.headers.Location) {
                                url = res.headers.Location;
                            } else {
                                reject('No redirect to to follow!');
                            }
                        } else {
                            done = true;
                        }
                    });
                });
                req.on('error', e => {
                    err = e;
                });
                req.on('close', () => {
                    if (err) {
                        return reject(err);
                    }
                    if (done) {
                        resolve(code === 200 ? buff : null);
                    } else {
                        d();
                    }
                });
                req.end();
            }
            d();
        });
    }

    /**
     * Clean directory.
     *
     * @param {string} directory Full path of directory to clean
     */
    cleanDir(directory) {
        const dir = fs.opendirSync(directory);
        if (dir) {
            while (true) {
                const ent = dir.readSync();
                if (ent) {
                    const filepath = path.join(ent.path, ent.name);
                    if (ent.isDirectory()) {
                        this.cleanDir(filepath);
                        fs.rmdirSync(filepath);
                    } else {
                        fs.rmSync(filepath);
                    }
                } else {
                    break;
                }
            }
            dir.closeSync();
        }
    }

    /**
     * Prepare a directory, clean it if it exists or create if none exists.
     *
     * @param {string} directory Full path of directory
     */
    prepDir(directory) {
        if (fs.existsSync(directory)) {
            this.cleanDir(directory);
        } else {
            fs.mkdirSync(directory, {recursive: true});
        }
    }

    /**
     * Run assets updater.
     *
     * @param {string} dest Path to destination folder
     */
    async run(dest) {
        if (this.package.assets) {
            // load CDN if exist
            const cdnFile = path.join(dest, 'cdn.json');
            if (fs.existsSync(cdnFile)) {
                this.cdn = JSON.parse(fs.readFileSync(cdnFile));
            }
            const assets = Object.keys(this.package.assets);
            for (const asset of assets) {
                const metadata = this.package.assets[asset];
                const pkg = metadata.name ? metadata.name : asset;
                const version = this.getVersion(pkg);
                if (version) {
                    console.log(`+ ${asset}: ${version}`);
                    try {
                        let pkgDir = path.join(__dirname, 'node_modules', pkg);
                        const destDir = path.join(dest, asset);
                        // sources {"src": "dest"}
                        let sources = metadata.source ? metadata.source : {dist: ''};
                        // sources ["src"] => {"src": "src"}
                        if (Array.isArray(sources)) {
                            const _sources = {}
                            sources.forEach(src => {
                                _sources[src] = src;
                            })
                            sources = _sources;
                        }
                        // download if needed
                        if (metadata.cdn) {
                            if (!this.package.cdn[metadata.cdn]) {
                                console.log(`  cdn not defined ${metadata.cdn}!`);
                                continue;
                            }
                            pkgDir = path.join(__dirname, '.files');
                            this.prepDir(pkgDir);
                            for (const src in sources) {
                                const url = this.package.cdn[metadata.cdn]
                                    .replace(/<PKG>/g, pkg)
                                    .replace(/<VER>/g, version)
                                    .replace(/<NAME>/g, src);
                                console.log(`  download ${url}...`);
                                const content = await this.downloadFile(url);
                                if (content) {
                                    const destFile = path.join(pkgDir, sources[src]);
                                    fs.writeFileSync(destFile, content);
                                }
                            }
                        }
                        // ignores
                        const ignores = this.ignores;
                        if (metadata.ignores) {
                            ignores.push(...metadata.ignores);
                        }
                        // copy files
                        let prepared = false
                        for (const src in sources) {
                            if (!prepared) {
                                prepared = true;
                                this.prepDir(destDir);
                            }
                            const srcFile = path.join(pkgDir, src);
                            const destFile = path.join(destDir, sources[src]);
                            if (fs.existsSync(srcFile)) {
                                console.log(`  copy ${pkg}/${src} => ${destFile}`);
                                fs.cpSync(srcFile, destFile, {recursive: true, filter: (src, dest) => {
                                    return this.isIgnored(path.basename(src), ignores) ? false : true;
                                }});
                            }
                        }
                        // update CDN
                        if (this.cdn && this.cdn[asset]) {
                            this.cdn[asset].version = version;
                        }
                    }
                    catch (err) {
                        console.error(err);
                    }
                } else {
                    console.log(`- ${asset}`);
                }
            }
            // save CDN
            if (fs.existsSync(cdnFile)) {
                const cdn = {};
                Object.keys(this.cdn).sort().forEach(pkg => {
                    cdn[pkg] = this.cdn[pkg];
                });
                fs.writeFileSync(cdnFile, JSON.stringify(cdn, null, 2));
                console.log(`+ cdn.json updated`);
            }
        }
    }
}

if (process.argv.length > 2) {
    if (fs.existsSync(process.argv[2])) {
        new App().run(process.argv[2]);
    }
} else {
    console.log(`Usage: node ${path.basename(process.argv[1])} DIR`);
}