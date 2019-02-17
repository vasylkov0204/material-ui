## Release Deployment

The release process consists of several phases, each one listed below. Version is in the semver format e.g. v1.0.0

A typical release follows these steps:

1. Create the CHANGELOG
2. Create a pull-request that updates the CHANGELOG.md with the title in the following format [CHANGELOG] Prepare <version>
   - This needs to be reviewed by a core-team member
3. Create a Release Draft on GitHub using the CHANGELOG
4. Release packages on NPM
   - Update package.json versios of the packages you want to release
   - Run the package.json release script in the packages you want to release
5. Github changes
   - Push the new version to Github
     - `git commit -am "<version>" && git push upstream master`
   - Create and push the new version tag to Github
     - `git tag <version> && git push upstream master --tag`
     
6. Crowdin
   - Sync Crowdin
     - You might need to enable this in the integration settings on Crowdin
   - After the sync has finished create a pull-request from l10n to master and merge 
   
7. Documentation
   - If not done already add material-ui-docs as an upstream
     - `git remote add material-ui-docs git@github.com:mui-org/material-ui-docs.git`
   - Pull upstream changes (Crowdin)
   - Run the package.json `docs:deploy` script
     
8. Github Release
   - Add your tag to your GitHub release
   - Publish :tada:
