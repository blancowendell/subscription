const fs = require("fs");
const moment = require("moment");
const LINQ = require("node-linq").LINQ;
const { format } = require("date-fns");
const os = require("os");
const interfaces = os.networkInterfaces();
const axios = require("axios");

//#region READ & WRITE JSON FILES
exports.ReadJSONFile = function (filepath) {
  // console.log(`Read JSON file: ${filepath}`);
  var data = fs.readFileSync(filepath, "utf-8");
  // console.log(`Contents: ${data}`);
  return JSON.parse(data);
};

exports.ReadFileBuffer = (filepath) => {
  var data = fs.readFileSync(filepath);

  return data;
};

exports.GetFolderList = function (dir) {
  // console.log(`Content: ${dir}`);
  var data = fs.readdirSync(dir);
  return data;
};

exports.DeleteFile = (file) => {
  try {
    fs.unlinkSync(file);

    console.log("File is deleted.");
  } catch (error) {
    console.log(error);
  }
};

exports.GetFileListContains = (path, contains) => {
  try {
    var dataArr = [];
    var data = fs.readdirSync(path, "utf-8");

    data.forEach((d) => {
      if (d.includes(contains)) {
        // console.log(d);
        dataArr.push({
          file: d,
        });
      }
    });

    return dataArr;
  } catch (error) {
    console.log(error);
  }
};

exports.GetFiles = function (dir) {
  //console.log(`Content: ${dir}`);
  var data = fs.readdirSync(dir);
  return data;
};

exports.CreateJSON = (filenamepath, data) => {
  // console.log(`Create JSON Path: ${filenamepath} Content: ${data}`);
  fs.writeFileSync(filenamepath, data, (err) => {
    return err;
  });
};

exports.CreateFolder = (dir) => {
  //console.log(`Create folder: ${dir}`);
  if (fs.existsSync(dir)) {
    //console.log(`Path exist: ${dir}`);
    return "exist";
  } else {
    //console.log(`Create path: ${dir}`);
    fs.mkdirSync(dir);
    return "create";
  }
};

exports.RequestDetails = (data) => {
  // console.log(`Request Details Extract: ${data}`);
  var result = [];
  data.forEach((k, i) => {
    result.push({
      store: k.store,
      ticket: k.ticket,
      brandname: k.brandname,
      itemtype: k.itemtype,
      quantity: k.quantity,
      remarks: k.remarks,
    });
  });
  return result;
};

//equipments item type
exports.Distinct = (data, indetifier, target) => {
  //console.log(`Data: ${data} \nTarget: ${brandname}`);
  var unique = [];

  if (indetifier == "itemtype") {
    // itemtype
    unique = data.map((item) => {
      if (item.brandname == target) {
        return item.itemname;
      }
    });
  }

  if (indetifier == "brandname") {
    // brandname
    unique = [...new Set(data.map((item) => item.brandname))];
  }

  return unique;
};

exports.MoveFile = (origin, destination) => {
  fs.renameSync(origin, destination);
  console.log(`Moved ${origin} to ${destination}`);
};

//#endregion

//#region  DATETIME
exports.GetCurrentYear = () => {
  return moment().format("YYYY");
};

exports.GetCurrentMonth = () => {
  return moment().format("MM");
};

exports.GetCurrentDay = () => {
  return moment().format("DD");
};

exports.GetCurrentDate = () => {
  return moment().format("YYYY-MM-DD");
};

exports.GetCurrentDatetime = () => {
  return moment().format("YYYY-MM-DD HH:mm");
};

exports.GetCurrentDatetimeSecconds = () => {
  return moment().format("YYYY-MM-DD HH:mm:ss");
};

exports.GetCurrentTime = () => {
  return moment().format("HH:mm");
};

exports.GetCurrentTimeSeconds = () => {
  return moment().format("HH:mm:ss");
};

exports.GetCurrentMonthFirstDay = () => {
  return moment().startOf("month").format("YYYY-MM-DD");
};

exports.GetCurrentMonthLastDay = () => {
  return moment().endOf("month").format("YYYY-MM-DD");
};

exports.ConvertToDate = (datetime) => {
  return moment(`${datetime}`).format("YYYY-MM-DD");
};

exports.AddDayTime = (day, hour) => {
  let now = moment();
  let future = now.add({ days: day, hours: hour });

  return future.format("YYYY-MM-DD hh:mm");
};

exports.SubtractDayTime = (idate, fdate) => {
  const initaldate = moment(`${idate}`);
  const finaldate = moment(`${fdate}`);
  const diffInDays = finaldate.diff(initaldate, "days");

  console.log(idate, fdate);

  console.log(`year: ${finaldate.diff(initaldate, "year")}`);
  console.log(
    `month: ${
      finaldate.diff(initaldate, "month") -
      12 * finaldate.diff(initaldate, "year")
    }`
  );

  return diffInDays;
};

exports.AddDay = (idate, index) => {
  const date = moment(`${idate}`);
  const newDate = date.add(index, "days");
  return newDate.format("YYYY-MM-DD");
};

// Adds months to a YYYY-MM-DD date. Clamps to month end (Jan 31 + 1 month = Feb 28/29).
exports.AddMonth = (idate, index) => {
  return moment(`${idate}`, "YYYY-MM-DD").add(index, "months").format("YYYY-MM-DD");
};

// Strict YYYY-MM-DD check (rejects 2026-02-30).
exports.IsValidDate = (datestring) => {
  return moment(`${datestring}`, "YYYY-MM-DD", true).isValid();
};

// True when date1 is before date2 (day precision).
exports.IsDateBefore = (date1, date2) => {
  return moment(`${date1}`, "YYYY-MM-DD").isBefore(moment(`${date2}`, "YYYY-MM-DD"), "day");
};

// Returns the later of two YYYY-MM-DD dates.
exports.MaxDate = (date1, date2) => {
  return moment(`${date1}`, "YYYY-MM-DD").isSameOrAfter(moment(`${date2}`, "YYYY-MM-DD"), "day")
    ? date1
    : date2;
};

exports.ConvertToDate = (datestring) => {
  if (typeof datestring === "string") {
    return moment(datestring).format("YYYY-MM-DD");
  } else {
    return this.convertExcelDate(datestring);
  }
};

exports.ConvertTo24Formart = (timestring) => {
  return moment(timestring, "h:mm a").format("HH:mm:ss");
};

exports.GenerateDates = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    // Format the date as YYYY-MM-DD
    const formattedDate = currentDate.toISOString().split("T")[0];
    dates.push(formattedDate);

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

exports.formatDate = (date) => {
  return moment(`${date}`).format("YYYY-MM-DD");
};

exports.GetMonthLastDay = (yearMonth) => {
  return moment(`${yearMonth}`).endOf("month").format("YYYY-MM-DD");
};

exports.getPreviousMonthFirstDay = () => {
  return moment().subtract(1, "months").startOf("month").format("YYYY-MM-DD");
};

exports.isDatetimeGeaterThan = (datetime1, datetime2) => {
  const date1 = moment(datetime1, "YYYY-MM-DD HH:mm:ss");
  const date2 = moment(datetime2, "YYYY-MM-DD HH:mm:ss");

  return date1.isAfter(date2);
};

exports.formatToAmPm = (timeStr) => {
  if (!timeStr) return "";

  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr.padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  hour = hour ? hour : 12;

  return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
};

//#endregion

//#region  SUMMARY REPORTS
exports.GetCablingEquipmentSummary = (target_folder) => {
  var data = [];
  let folders = this.GetFolderList(target_folder);

  folders.forEach((folder) => {
    let targetDir = `${target_folder}${folder}`;
    var files = this.GetFiles(targetDir);

    files.forEach((file) => {
      let filename = `${targetDir}/${file}`;
      jsonData = this.ReadJSONFile(filename);

      jsonData.forEach((key, item) => {
        data.push({
          itemname: key.itemtype,
          itemcount: key.itemcount,
        });
      });
    });
  });

  return data;
};

exports.GetRequestSummary = (it, tranfer, cabling) => {
  var data = [];
  let itequipmentrequest = fs.readdirSync(it);
  let transferequipmentrequest = fs.readdirSync(tranfer);
  let cablingequipmentrequest = fs.readdirSync(cabling);

  data.push({
    itrequest: itequipmentrequest.length,
    transfer: transferequipmentrequest.length,
    cablingrequest: cablingequipmentrequest.length,
  });

  return data;
};

exports.GetDetailedEquipmentSummary = (
  masterItemsDir,
  equipmentDir,
  department
) => {
  try {
    let data;
    let filter = [];
    let itemsArr = this.GetFiles(masterItemsDir);
    let folders = this.GetFolderList(equipmentDir);

    console.log(`${masterItemsDir} - ${equipmentDir}`);

    let items_filter = new LINQ(itemsArr)
      .Where((item) => {
        return item.includes(department);
      })
      .OrderBy((item) => {
        return item;
      })
      .ToArray();

    items_filter.forEach((item) => {
      let itemname = item.split("_");
      filter.push(itemname[0]);
    });

    //read all json files in equipment folder on each folders
    ReadAllJSONFiles = (folders, root) => {
      let filesArr = [];
      folders.forEach((folder) => {
        let targetFolder = `${root}${folder}`;
        let files = this.GetFiles(targetFolder);

        files.forEach((file) => {
          filesArr.push({
            file: file,
          });
        });
      });

      return filesArr;
    };
    //get item counts
    GetItemCountSummary = (files, filter) => {
      let items = [];

      console.log(itemsArr);

      filter.forEach((item) => {
        let arr = new LINQ(files)
          .Where((t) => {
            return t.file.includes(item);
          })
          .OrderBy((t) => {
            return t.file;
          })
          .ToArray();

        items.push({
          itemname: item,
          itemcount: arr.length,
        });
      });

      console.log(items);

      return items;
    };

    let files = ReadAllJSONFiles(folders, equipmentDir);

    console.log(files);

    data = GetItemCountSummary(files, filter);

    console.log(data);

    return data;
  } catch (error) {
    throw error;
  }
};

exports.GetEquipmentSummary = (target_folder) => {
  var data = [];
  let folders = this.GetFolderList(target_folder);

  folders.forEach((folder) => {
    let targetFolder = `${target_folder}${folder}`;
    var files = fs.readdirSync(targetFolder);
    data.push({
      itemname: folder,
      itemcount: files.length,
    });
  });

  return data;
};
//#endregion

//#region
exports.UpdateCablingItemCount = (target_file, itemcount) => {
  let file = this.ReadJSONFile(target_file);
  let data = [];

  console.log(`TARGET FILE: ${target_file} DEDUCTION: ${itemcount}`);
  let difference = 0;
  file.forEach((key, item) => {
    let current_count = parseFloat(key.itemcount);
    let deduct = parseFloat(itemcount);
    difference = current_count - deduct;
    let dataJson;

    console.log(`${current_count} - ${deduct}`);

    data.push({
      brandname: key.brandname,
      itemtype: key.itemtype,
      itemcount: difference,
      updateby: key.updateby,
      updatedate: key.updatedate,
      createdby: key.createdby,
      createddate: key.createddate,
    });

    dataJson = JSON.stringify(data, null, 2);
    this.CreateJSON(target_file, dataJson);
  });
};
//#endregion

//#region USE LINQ for filtering json data
exports.GetByDeparmentItems = (data, index, callback) => {
  try {
    let arr = new LINQ(data)
      .Where((d) => {
        return d.department === index;
      })
      .Select((d) => {
        return { brandname: d.brandname };
      })
      .ToArray();

    callback(null, arr);
  } catch (error) {
    callback(null, error);
  }
};

exports.GetByDeparmentPersonel = (data, index, callback) => {
  try {
    let arr = new LINQ(data)
      .Where((d) => {
        return d.positions === index;
      })
      .Select((d) => {
        return { fullname: d.fullname };
      })
      .ToArray();

    callback(null, arr);
  } catch (error) {
    callback(null, error);
  }
};

exports.GetByClientStores = (data, index, callback) => {
  try {
    let arr = new LINQ(data)
      .Where((d) => {
        return d.clientname === index;
      })
      .Select((d) => {
        return { storename: `${d.storenumber} ${d.storename}` };
      })
      .ToArray();

    callback(null, arr);
  } catch (error) {
    callback(null, error);
  }
};
//#endregion

//#region
exports.JSONNoSpace = (data) => {
  const jsonString = JSON.stringify(data, (key, value) => {
    if (typeof value === "string") {
      return value.replace(/\s/g, "");
    }
    console.log(jsonString);
    return value;
  });
};

exports.JSONRevert = (json) => {};
//#endregion

//#region number padding
exports.GeneratePO = (year, number) => {
  const padded = number.toString().padStart(4, "0");
  const ponumber = `${year}-${padded}`;
  return ponumber;
};
//#endregion

//#region array filters
exports.removeDuplicateSets = (arr) => {
  const uniqueSets = new Set(arr.map(JSON.stringify)); // Use JSON.stringify for comparison
  const result = Array.from(uniqueSets).map(JSON.parse);
  return result;
};

exports.ConvertToJson = (data) => {
  const uniqueSets = new Set(data.map(JSON.stringify)); // Use JSON.stringify for comparison
  const result = Array.from(uniqueSets).map(JSON.parse);
  return result;
};
//#endregion

exports.convertExcelDate = (serialDate) => {
  // Excel serial date starts from 1900-01-01
  const baseDate = new Date("1899-12-30");
  const offsetInMilliseconds = serialDate * 24 * 60 * 60 * 1000;
  const resultDate = new Date(baseDate.getTime() + offsetInMilliseconds);
  const result = format(resultDate, "yyyy-MM-dd");
  return result;
};

exports.convertExcelDatetime = (serialDate) => {
  // Excel serial date starts from 1900-01-01
  const baseDate = new Date("1899-12-30");
  const offsetInMilliseconds = serialDate * 24 * 60 * 60 * 1000;
  const resultDate = new Date(baseDate.getTime() + offsetInMilliseconds);
  const result = format(resultDate, "yyyy-MM-dd HH:mm:ss");
  return result;
};
//#region Network Information

exports.getNetwork = () => {
  return new Promise((resolve, reject) => {
    Object.keys(interfaces).forEach((interfaceName) => {
      interfaces[interfaceName].forEach((iface) => {
        // Filter for IPv4 addresses
        if (iface.family === "IPv4" && !iface.internal) {
          // console.log(`${interfaceName}: ${iface.address}`);
          resolve(`${iface.address}`);
        }
      });
    });
  });
};

exports.GetIPAddress = () => {
  return new Promise((resolve, reject) => {
    axios
      .get("https://api.ipify.org?format=json")
      .then((response) => {
        console.log(`Your IP address is: ${response.data.ip}`);
        resolve(response.data.ip);
      })
      .catch((error) => {
        reject(error);
        console.error("Error fetching IP address:", error);
      });
  });
};

//#endregion