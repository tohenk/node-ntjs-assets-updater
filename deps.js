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

const package = path.join(__dirname, 'package.json');
if (fs.existsSync(package)) {
    const packageInfo = JSON.parse(fs.readFileSync(package));
    if (packageInfo.dependencies) {
        const pkgs = [];
        for (const pkg of Object.keys(packageInfo.dependencies)) {
            pkgs.push(`${pkg}@latest`);
        }
        const lines = [];
        const ext = process.platform === 'win32' ? 'cmd' : 'sh';
        const eol = process.platform === 'win32' ? '\r\n' : '\n';
        const filename = path.join(__dirname, `deps.${ext}`);
        if (process.platform !== 'win32') {
            lines.push('#!/bin/bash');
            lines.push('');
        }
        lines.push(`npm install ${pkgs.join(' ')}`);
        fs.writeFileSync(filename, lines.join(eol));
        if (process.platform !== 'win32') {
            fs.chmod(filename, 0o775, err => {
                console.error(err);
            });
        }
    }
}
