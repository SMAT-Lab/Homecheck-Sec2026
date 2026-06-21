"use strict";function _newArrowCheck(e,r){if(e!==r)throw new TypeError("Cannot instantiate an arrow function")}const fs=require("fs"),program=require("commander");program.parse(process.argv);let name="HelloAce",appID="ace.helloworld",appName="HelloAce";program.args&&program.args[0]&&(name=program.args[0],appID=program.args[0],appName=program.args[0]);const regPath=/[`~!@#$%^&*()_+<>?:"{},./;'[\]]/im;function createProject(e){var t=this;if(1<e.trim().split("/").length||regPath.test(e))return console.error("ERROR: The project name cannot be a path nor contain any special symbol.\nNOTE: To create the template project, run 'npm run create' in the root directory.\nNOTE: To customize the project name, run 'npm run create <projectName>'.");const o=e+"/app.ets",n=e+"/manifest.json",a=e+"/pages/index.ets",i=`{
  "appID": "com.example.`+appID+`",
  "appName": "`+appName+`",
  "versionName": "1.0.0",
  "versionCode": 1,
  "minPlatformVersion": "1.0.1",
  "pages": [
    "pages/index"
  ],
  "window": {
    "designWidth": 750,
    "autoDesignWidth": false
  }
}`;fs.mkdir(e+"/pages",{recursive:!0},function(e){var r=this;if(_newArrowCheck(this,t),e)return console.error("ERROR: Failed to create project directory.");fs.writeFile(o,`export default {
    onCreate() {
        console.info('Application onCreate')
    },
    onDestroy() {
        console.info('Application onDestroy')
    },
}`,function(e){if(_newArrowCheck(this,r),e)return console.error("ERROR: Failed to write app.ets.")}.bind(this)),fs.writeFile(n,i,function(e){if(_newArrowCheck(this,r),e)return console.error("ERROR: Failed to write manifest.json.")}.bind(this)),fs.writeFile(a,`@Entry
@Component
struct MyComponent {
  private value1: string = "hello world 1";
  private value2: string = "hello world 2";
  private value3: string = "hello world 3";

  build() {
    Column() {
      Text(this.value1);
      Text(this.value2);
      Text(this.value3);
    }
  }
}`,function(e){if(_newArrowCheck(this,r),e)return console.error("ERROR: Failed to write index.ets.")}.bind(this))}.bind(this))}createProject(name);