#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');

// Load configuration
const configPath = process.argv[3] || 'backup-config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Validate config
if (!config.backupDir || !config.sourceDir) {
    console.error('Invalid configuration. Please provide backupDir and sourceDir.');
    process.exit(1);
}

// Create backup directory if it doesn't exist
if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
}

// Generate timestamp
const timestamp = moment().format('YYYYMMDD-HHmmss');
const backupName = `node-red-backup-${timestamp}.tar.gz`;
const backupPath = path.join(config.backupDir, backupName);

// Create backup command
const cmd = `tar -czf ${backupPath} -C ${path.dirname(config.sourceDir)} ${path.basename(config.sourceDir)}`;

console.log(`Creating backup: ${backupName}`);
console.log(`Source: ${config.sourceDir}`);
console.log(`Destination: ${backupPath}`);

// Execute backup
exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup failed: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Backup stderr: ${stderr}`);
        return;
    }
    console.log(`Backup successful: ${backupPath}`);
    
    // Rotate backups if retention is configured
    if (config.retentionDays) {
        rotateBackups(config.backupDir, config.retentionDays);
    }
});

// Rotate old backups
function rotateBackups(backupDir, retentionDays) {
    console.log(`Rotating backups older than ${retentionDays} days...`);
    
    fs.readdir(backupDir, (err, files) => {
        if (err) {
            console.error(`Error reading backup directory: ${err}`);
            return;
        }
        
        const cutoff = moment().subtract(retentionDays, 'days');
        
        files.forEach(file => {
            if (file.startsWith('node-red-backup-') && file.endsWith('.tar.gz')) {
                const fileDateStr = file.match(/node-red-backup-(.*?)\.tar\.gz/)[1];
                const fileDate = moment(fileDateStr, 'YYYYMMDD-HHmmss');
                
                if (fileDate.isBefore(cutoff)) {
                    const filePath = path.join(backupDir, file);
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error(`Error deleting old backup ${file}: ${err}`);
                        } else {
                            console.log(`Deleted old backup: ${file}`);
                        }
                    });
                }
            }
        });
    });
}