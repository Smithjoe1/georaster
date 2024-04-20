#from herbie import Herbie
from herbie import HerbieLatest
from datetime import date

import cartopy.crs as ccrs
import matplotlib.pyplot as plt
import numpy as np

import os
import subprocess
from osgeo import gdal

from pathlib import Path


today = date.today()
dateFormat = today.strftime("%Y-%m-%d" + " 00:00")
print(dateFormat)

output_folder = str(Path.home()) + "/tiff/"

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)
# Call the function to extract bands and convert to GeoTIFF

# Init download
H = HerbieLatest(
    #dateFormat,
    model="gefs",
    product="atmos.25",
    member="mean",
)


# Show all the available products (from the model template file)

H.PRODUCTS

#ds = H.inventory()  
#ds

#df.variable.unique()

#H.inventory("HGT")

#ds = H.xarray("PWAT")
#ds

#ds2 = H.xarray("HGT:500 mb")
#ds2

path = H.download()




# Open the GRIB2 dataset
input_grib_file = gdal.Open(path)

# Loop through each band in the dataset
for i in range(1, input_grib_file.RasterCount + 1):
    band = input_grib_file.GetRasterBand(i)
    grib_short_name = band.GetMetadataItem("GRIB_SHORT_NAME")

    # Set output GeoTIFF file name
    output_tiff_file = os.path.join(output_folder, 'band' + str(i) + '-' + f"{grib_short_name}" + '.tiff')
    output_tiff_file_tmp = os.path.join(output_folder, 'band' + str(i) + '.tiff')
    # Create command for gdal_translate
    # gdal_translate -b 68 -ot Byte -scale -outsize 2160 1083 -r lanczos ./data/gefs/20240320/geavg.t00z.pgrb2a.0p50.f000 ./test.tiff
    # command = ( 'gdal_translate', '-b', str(i), input_grib_file, output_tiff_file)

    # Run gdal_translate command
    # subprocess.run(command)
    #options = gdal.TranslateOptions()
    #band = ds.GetMetadata()
    #    out_ds = gdal.Translate(output_tiff_file, input_grib_file, format='GTiff', bandList=[i], outputType=gdal.GDT_Float32, outputSRS = 'EPSG:4326' ,creationOptions = ['STREAMABLE_OUTPUT=YES', 'COMPRESS=LZW'])
    translatecommand = "gdal_translate -of GTiff -of COG -b " + str(i) + " -ot Float32 " +str(path) + " " + output_tiff_file_tmp
    print(translatecommand)
    
    os.system(translatecommand)

    warpcommand = "gdalwarp -t_srs EPSG:4326 -r lanczos -overwrite -tr 0.1  0.1 -co TILED=YES -co INTERLEAVE=BAND -co COPY_SRC_OVERVIEWS=YES -co COMPRESS=LZW -co PREDICTOR=2 -ot Int16 " + output_tiff_file_tmp + " " + output_tiff_file
    # -tr 0.025  0.025
    print(warpcommand)
    os.system(warpcommand)



    # out_ds = gdal.Translate(output_tiff_file_tmp, input_grib_file, format='GTiff', bandList=[i], outputType=gdal.GDT_Float32, creationOptions = ['])

    # outputSRS = 'EPSG:4326' ,creationOptions = ['STREAMABLE_OUTPUT=YES', 'COMPRESS=LZW']

    #arget_srs = 'EPSG:4326'

    #out_ds = gdal.Warp(output_tiff_file, output_tiff_file_tmp, dstSRS=target_srs)
    # gdaladdo -ro --config COMPRESS_OVERVIEW LZW ./tiff/band1-0-SFC.tiff 2 4 8 16

    aladdocommand = ("gdaladdo -ro --config COMPRESS_OVERVIEW LZW ") + output_tiff_file + (" 2 4 8 16 32 64")
    print(aladdocommand)
    os.system(aladdocommand)

    os.remove(output_tiff_file_tmp)


    print(f"Converted band {i} to GeoTIFF: {output_tiff_file}")

input_grib_file = None  # Close the dataset
