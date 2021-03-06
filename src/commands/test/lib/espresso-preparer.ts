import { IFileDescriptionJson } from "./test-manifest-reader";
import { out } from "../../../util/interaction";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as pglob from "../../../util/misc/promisfied-glob";
import * as pfs from "../../../util/misc/promisfied-fs";

export class EspressoPreparer {
  private readonly artifactsDir: string;
  private readonly buildDir: string;
  private readonly testApkPath: string;

  constructor(artifactsDir: string, buildDir: string, testApkPath?: string) {
    if (!artifactsDir) {
      throw new Error("Argument artifactsDir is required");
    }

    this.buildDir = buildDir;
    this.artifactsDir = artifactsDir;
    this.testApkPath = testApkPath;
  }

  private validateEitherBuildDirOrTestApkPath() {
    if (this.buildDir && this.testApkPath) {
      throw new Error("You must not specify both build dir and test apk path.");
    }
    if (!(this.buildDir || this.testApkPath)) {
      throw new Error("Either projectDir, buildDir or testApkPath must be specified");
    }
  }

  public async prepare(): Promise<string> {
    this.validateEitherBuildDirOrTestApkPath();
    if (this.testApkPath) {
      await this.validatePathExists(
                    this.testApkPath,
                    true,
                    `File not found for test apk path: "${this.testApkPath}"`);
      await pfs.cpFile(this.testApkPath, path.join(this.artifactsDir, path.basename(this.testApkPath)));
    }
    else {
      await this.validateBuildDir();
      await pfs.cpDir(this.buildDir, this.artifactsDir);
    }
    let manifestPath = path.join(this.artifactsDir, "manifest.json");
    let manifest = await this.createEspressoManifest();
    let manifestJson = JSON.stringify(manifest, null, 1);
    await pfs.writeFile(manifestPath, manifestJson);

    return manifestPath;
  }

  private async validateBuildDir() {
    await this.validateBuildDirExists();
    await this.validateTestApkExists();
  }

  private async validateBuildDirExists() {
    await this.validatePathExists(
      this.buildDir,
      false,
      `Espresso build directory "${this.buildDir}" doesn't exist`);
  }

  private async validateTestApkExists(): Promise<void> {
    await this.detectTestApkPathFromBuildDir();
  }

  private async detectTestApkPathFromBuildDir(): Promise<string> {
    let apkPattern = path.join(this.buildDir, "*androidTest.apk");
    let files = await pglob.glob(apkPattern);
    
    if (files.length === 0) {
       throw new Error(`An apk with name matching "*androidTest.apk" was not found inside directory inside build directory "${this.buildDir}"`);
    }
    else if (files.length >= 2) {
       throw new Error(`Multiple apks with name matching "*androidTest.apk" was found inside directory inside build directory "${this.buildDir}". A unique match is required.`);
    }
    else {
      let apkPath = files[files.length - 1];
      return apkPath;
    }
  }

  private async validatePathExists(path: string, isFile: boolean, errorMessage: string): Promise<void> {
    let stats: fs.Stats = null;
    
    try {
      stats = await pfs.stat(path);
    }
    catch (err) {
      throw new Error(errorMessage);
    }

    if (isFile !== stats.isFile()) {
      throw new Error(errorMessage);
    }
  }

  private async createEspressoManifest(): Promise<any> {
    let apkFullPath = this.testApkPath ? this.testApkPath : await this.detectTestApkPathFromBuildDir();
    let apkArtifactsPath = path.basename(apkFullPath); 
    let result = {
      "schemaVersion": "1.0.0",
      "files": [apkArtifactsPath],
      "testFramework": {
        "name": "espresso",
        "data": { }
      }
    };

    return result;
  }
}