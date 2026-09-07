/**
 * Mahani Builder AI - Centralized Version Management
 * 
 * This file contains ALL version dependencies for the entire system.
 * Every module MUST import versions from this file to ensure consistency.
 */

const VERSIONS = {
  // Flutter & Dart
  flutter: '3.35.7',
  dartSdk: '>=3.9.0 <4.0.0',
  
  // Java & Android
  java: '17',
  androidCompileSdk: 35,
  androidMinSdk: 21,
  androidTargetSdk: 35,
  buildTools: '35.0.0',
  gradle: '8.10.2',
  kotlin: '2.1.0',
  agp: '8.7.0',
  
  // Flutter Packages
  packages: {
    equatable: '^2.1.0',
    cupertino_icons: '^1.0.8',
    provider: '^6.1.5',
    go_router: '^16.2.0',
    sqflite: '^2.4.2',
    drift: '^2.28.1',
    path: '^1.9.1',
    shared_preferences: '^2.5.3',
    intl: '^0.20.2',
    flutter_local_notifications: '^19.4.0',
    pdf: '^3.11.3',
    printing: '^5.14.2',
    excel: '^4.0.6',
    file_picker: '^10.3.2',
    permission_handler: '^12.0.1',
    path_provider: '^2.1.5',
    http: '^1.5.0',
    uuid: '^4.5.1',
    crypto: '^3.0.6'
  },
  
  // GitHub Actions
  actions: {
    checkout: 'v4',
    setupJava: 'v5',
    setupFlutter: 'v2',
    uploadArtifact: 'v4'
  }
};

module.exports = VERSIONS;
