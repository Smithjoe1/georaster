# Update
Modified webpack config and npm packages to use webpack 5 and current versions of dependancies.

I was getting javascript invalid size error "Fatal JavaScript invalid size error 174895934 (see crbug.com/1201626)" when setting target via " --target web" so I have the config to only compile to web version.

I have changed the worker functions to use Webpack 5 native versions. 
I have also changed to workaround the Webpack 5 polyfill functions. 
Not sure if any of it is the correct way to acomplish, but it compiles and works when I load it on my browser.

I have also set compile to not minimize the build for ease of debugging. I'm trying to find out why low resolution geotiff files aren't being smoothed with the resampling function.

Compile via "npm run build"


Script called Herbie.py has been created to use https://github.com/blaylockbk/Herbie to download latest NOAA data and convert to GEOTIFF to display over a leaflet tile server. My current server uses Matrin https://github.com/maplibre/martin to load global PMTiles data file and is parsed to Protomaps Leaflet. https://github.com/protomaps/protomaps-leaflet
This provides a nearly fully client side rendered global weather maps and is a placeholder here until I finish building the rest of the page.



# georaster
Wrapper around Georeferenced Rasters like GeoTIFF, NetCDF, JPG, and PNG that provides a standard interface.  You can also create your own georaster from simple JavaScript objects.

# load from url on front-end
```javascript
const parseGeoraster = require("georaster");
fetch(url)
  .then(response => response.arrayBuffer() )
  .then(parseGeoraster)
  .then(georaster => {
      console.log("georaster:", georaster);
  });
```

# load from file on back-end
```javascript
const parseGeoraster = require("georaster");
fs.readFile("data/GeogToWGS84GeoKey5.tif", (error, data) => {
    parseGeoraster(data).then(georaster => {
      console.log("georaster:", georaster);
    })
});
```

# load from File (or other Blob) on front-end
```javascript
const parseGeoraster = require("georaster");
document.querySelector("input").addEventListener("change", e => {
  const file = e.target.files[0];
  parseGeoraster(file)
    .then(georaster => {
      console.log("georaster:", georaster);
    });
});
```

# load from simple object on front-end
```javascript
const parseGeoraster = require("georaster");
const values = [ [ [0, 1, 2], [0, 0, 0], [2, 1, 1] ] ];
const noDataValue = 3;
const projection = 4326;
const xmin = -40;
const ymax = 14;
const pixelWidth = 0.00001;
const pixelHeight = 0.00001;
const metadata = { noDataValue, projection, xmin, ymax, pixelWidth, pixelHeight };
const georaster = parseGeoraster(values, metadata);
```

# load [cloud optimized geotiff](https://www.cogeo.org/)
This option (and File with readOnDemand, below) allows you to basically
load the pixels only when you need them versus the other options
that require you to load the whole image into memory.  It will also attempt to automatically discover any available overview files.

*where to clip*

`top` is how many pixels from the **top** of the image to skip over before we start clipping

`bottom` is how many pixels from the **bottom** of the image to skip over before we start clipping

`left` is how many pixels in from the **left** side of the image to skip over before we start clipping

`right` is how many pixels in from the **right** side of the image to skip over before we start clipping


*clipping resolution*

`width` is how many pixels **wide** should be the returned image.  This helps to configure the resolution.

`height` is how many pixels **tall** should be the returned image.  This helps to configure the resolution.

*resampling*

`resampleMethod` is how to resample the pixels for the returned image.  This value is passed on to [geotiff.js](https://github.com/geotiffjs/geotiff.js)' readRasters function and defaults to 'bilinear'.  The alternative is 'nearest', which is faster and better for categorical data like landcover and continous classes with smooth variation like temperature.

```javascript
  const raster_url = "https://landsat-pds.s3.amazonaws.com/c1/L8/024/030/LC08_L1TP_024030_20180723_20180731_01_T1/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF";
  parseGeoraster(raster_url).then(georaster => {
    console.log(georaster.height);
    const options = { left: 0, top: 0, right: 4000, bottom: 4000, width: 10, height: 10 };
    georaster.getValues(options).then(values => {
      console.log("clipped values are", values);
    });
  });
```

# load from File on demand
By default, a File or ArrayBuffer will be read and parsed completely
at full resolution in a worker thread (if available) before
the promise returned by parseGeoraster() is resolved.
If less data is required (such as when the file includes overviews),
then the readOnDemand option allows reading and parsing to be deferred
until getValues() is called.
```javascript
  parseGeoraster(file, { readOnDemand: true })
    .then(georaster => georaster.getValues(options))
    .then(values => ...
```

# required properties
| name | description |
| ---- | ----------- |
| maxs | array with max value for each band |
| mins | array with min value for each band |
| ranges | array with difference between max and min value for each band |
| noDataValue | no data value |
| pixelWidth | width of pixel in dimension of coordinate reference system |
| pixelHeight | height of pixel in dimension of coordinate reference system |
| projection | equal to EPSG code, like 4326 |
| values | two dimensional array of pixel values (for Cloud Optimized GeoTIFF's, use `getValues` instead)  |
| width | number of pixels wide raster is |
| xmax | xmax in crs, which is often in longitude |
| xmin | xmin in crs, which is often in longitude |
| ymin | ymin in crs, which is often in latitude |
| ymax | ymax in crs, which is often in latitude |

# optional properties
| name | description |
| ---- | ----------- |
| palette | Array that maps raster values to RGBA colors |

# functions
| name | description |
| ---- | ----------- |
| getValues | described above |
| toCanvas | experimental! returns a canvas picture of the data.  You can pass in options object with height or width specified |

# loading georaster package through a script tag
```html
<script src="https://unpkg.com/georaster"></script>
```
You can view a simple demo of this [here](https://geotiff.github.io/georaster/test/)

# Support
Post a Github issue or contact the package author, Daniel J. Dufour, at daniel.j.dufour@gmail.com
