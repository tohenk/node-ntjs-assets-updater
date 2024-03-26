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
const JSZip = require('jszip');

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
     * Get all ignored files.
     *
     * @param {string[]} ignores Ignored files
     * @returns {string[]}
     */
    getIgnored(...ignores) {
        const result = [...this.ignores];
        const f = ignores => {
            if (Array.isArray(ignores)) {
                ignores.forEach(ignore => {
                    if (Array.isArray(ignore)) {
                        f(ignore);
                    } else if (ignore && result.indexOf(ignore) < 0) {
                        result.push(ignore);
                    }
                });
            }
        }
        f(ignores);
        return result;
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
                    res.on('data', chunk => {
                        if (buff) {
                            buff = Buffer.concat([buff, chunk]);
                        } else {
                            buff = chunk;
                        }
                    });
                    res.on('end', () => {
                        if (code === 301 || code === 302) {
                            if (res.headers.location) {
                                url = res.headers.location;
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
     * Prepare a directory, clean it if it exists or create if none exists.
     *
     * @param {string} directory Full path of directory
     */
    prepDir(directory) {
        if (fs.existsSync(directory)) {
            fs.rmSync(directory, {recursive: true, force: true});
        }
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {recursive: true});
        }
    }

    /**
     * Update assets.
     *
     * @param {object} packages Packages metadata
     * @param {string} dir Destination directory
     * @param {object} options Options
     * @param {string[]} [options.updates]
     * @param {boolean} [options.verbose]
     * @param {string[]} [options.ignores]
     */
    async updateAsset(packages, dir, options = {}) {
        const assets = Object.keys(packages);
        const updates = options.updates || [];
        for (const asset of assets) {
            if (updates.length && updates.indexOf(asset) < 0) {
                continue;
            }
            const metadata = packages[asset];
            if (metadata.packages) {
                await this.updateAsset(metadata.packages, path.join(dir, asset), Object.assign({}, options, {ignores: metadata.ignores}));
            } else {
                let prepared = false
                // allow combine multiple package
                const items = Array.isArray(metadata) ? metadata : [metadata];
                for (const mdata of items) {
                    const pkgs = mdata.name ? (Array.isArray(mdata.name)  ? mdata.name : [mdata.name]) : [asset];
                    for (const pkg of pkgs) {
                        let version = this.getVersion(pkg);
                        if (version) {
                            console.log(`+ ${asset}: ${version}`);
                            try {
                                const moduleDir = path.join(__dirname, 'node_modules', pkg);
                                const destDir = path.join(dir, mdata.dest ? mdata.dest : asset);
                                let pkgDir = moduleDir;
                                // sources {"src": "dest"}
                                let sources = mdata.source ? mdata.source : {dist: ''};
                                // sources ["src"] => {"src": "src"}
                                if (Array.isArray(sources)) {
                                    const _sources = {}
                                    sources.forEach(src => {
                                        _sources[src] = src;
                                    })
                                    sources = _sources;
                                }
                                // download if needed
                                if (mdata.cdn) {
                                    if (!this.package.cdn[mdata.cdn]) {
                                        console.log(`  cdn not defined ${mdata.cdn}!`);
                                        continue;
                                    }
                                    pkgDir = path.join(__dirname, '.files');
                                    this.prepDir(pkgDir);
                                    for (const src in sources) {
                                        const url = this.package.cdn[mdata.cdn]
                                            .replace(/<PKG>/g, pkg)
                                            .replace(/<VER>/g, version)
                                            .replace(/<NAME>/g, src);
                                        console.log(`  download ${url}...`);
                                        const content = await this.downloadFile(url);
                                        if (content) {
                                            if (url.endsWith('.zip')) {
                                                const zip = await JSZip.loadAsync(content);
                                                for (const entry of Object.values(zip.files)) {
                                                    const filepath = path.join(pkgDir, entry.name);
                                                    if (entry.dir) {
                                                        fs.mkdirSync(filepath, {recursive: true});
                                                    } else {
                                                        const buff = await entry.async('nodebuffer');
                                                        fs.writeFileSync(filepath, buff);
                                                    }
                                                }
                                            } else {
                                                const destFile = path.join(pkgDir, sources[src] !== '.' ? sources[src] : path.basename(url));
                                                fs.writeFileSync(destFile, content);
                                            }
                                        }
                                    }
                                }
                                // ignores
                                const ignored = this.getIgnored(options.ignores, metadata.ignores);
                                // copy files
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
                                            const accepted = !this.isIgnored(path.basename(src), ignored);
                                            if (options.v || options.verbose) {
                                                console.log(`  ${accepted ? 'ok' : 'skip'} ${src}`);
                                            }
                                            return accepted;
                                        }});
                                    }
                                }
                                // update CDN
                                if (this.cdn && this.cdn[asset]) {
                                    // get version from file content
                                    if (mdata.version && mdata.version.source && mdata.version.pattern) {
                                        const srcVersion = path.join(moduleDir, mdata.version.source);
                                        if (fs.existsSync(srcVersion)) {
                                            const matches = fs.readFileSync(srcVersion).toString().match(mdata.version.pattern);
                                            if (matches.groups && matches.groups.VERSION) {
                                                version = matches.groups.VERSION;
                                            }
                                        }
                                    }
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
                }
            }
        }
    }

    /**
     * Run assets updater.
     *
     * @param {string[]} args Arguments
     * @param {object} options Options
     * @param {boolean} [options.verbose]
     */
    async run(args, options = {}) {
        const dest = args.shift();
        if (fs.existsSync(dest) && this.package.assets) {
            // load CDN if exist
            let oldCdn;
            const cdnFile = path.join(dest, 'cdn.json');
            if (fs.existsSync(cdnFile)) {
                oldCdn = fs.readFileSync(cdnFile);
                this.cdn = JSON.parse(oldCdn);
                console.log(`+ ${path.basename(cdnFile)} loaded`);
            }
            await this.updateAsset(this.package.assets, dest, Object.assign({}, options, {updates: args}));
            // save CDN
            if (oldCdn) {
                const cdn = {};
                Object.keys(this.cdn).sort((a, b) => a.localeCompare(b)).forEach(pkg => {
                    cdn[pkg] = this.cdn[pkg];
                });
                const newCdn = JSON.stringify(cdn, null, 2);
                if (oldCdn != newCdn) {
                    fs.writeFileSync(cdnFile, newCdn);
                    console.log(`+ ${path.basename(cdnFile)} updated`);
                }
            }
        }
    }
}

function usage() {
    console.log(`Usage: node ${path.basename(process.argv[1])} [options] DIR [PKG...]

  DIR              The asset directory to update, if it contains a cdn.json then
                   the version will also be updated
  PKG              The package to updates, e.g. pdfjs

Options:
  -v, --verbose    Be verbose
`);
}

if (process.argv.length > 2) {
    const options = {};
    const args = process.argv.slice(2);
    while (true) {
        if (!args.length) {
            break;
        }
        if (args[0].startsWith('-') || args[0].startsWith('--')) {
            let arg = args.shift();
            arg = arg.substr(arg.startsWith('--') ? 2 : 1);
            if (arg.indexOf('=') > 0) {
                options[arg.substr(0, arg.indexOf('='))] = arg.substr(arg.indexOf('=') + 1);
            } else {
                options[arg] = true;
            }
        } else {
            break;
        }
    }
    if (args.length) {
        new App().run(args, options);
    } else {
        usage();
    }
} else {
    usage();
}