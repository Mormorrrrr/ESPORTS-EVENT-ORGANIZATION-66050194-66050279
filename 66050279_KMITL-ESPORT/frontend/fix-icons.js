const fs = require('fs');
const path = require('path');

const frontendDir = '/Users/memyink/Documents/66050279_KMITL-ESPORT/ESPORTS-EVENT-ORGANIZATION-66050194-66050279/66050279_KMITL-ESPORT/frontend';
const absIconsPath = path.join(frontendDir, 'icons');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

walkDir(frontendDir, (filePath) => {
    if (filePath.endsWith('.html')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        const fileDir = path.dirname(filePath);
        let relPathToIcons = path.relative(fileDir, absIconsPath).split(path.sep).join('/');
        
        const absPrefix = '/Users/memyink/Documents/66050279_KMITL-ESPORT/ESPORTS-EVENT-ORGANIZATION-66050194-66050279/66050279_KMITL-ESPORT/frontend/icons/';
        content = content.replace(new RegExp(absPrefix.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), relPathToIcons + '/');

        content = content.replaceAll('../../../icons/', relPathToIcons + '/');
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
});
