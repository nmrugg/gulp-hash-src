// jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, onevar: true, strict:true, undef:true, unused:true, curly:true, node:true, newcap:true

"use strict";

var through = require("through2"),
    fs_helper = require("fs_helper"),
    girdle = require("girdle"),
    p = require("path"),
    
    //find_regex = /(src|href)\s*=([^>]+)/i,
    //find_regex = /(?:href|src)\s*=\s*(?:(["'])((?:\\\1|.)*)?\1|([^'"\s>]*))/i;
    //find_regex = /(?:href|src)\s*=\s*(["'])((?:\\\1|.)*)?\1/i;
    find_regex = /(href|src)\s*=\s*(?:(")([^"]*)|(')([^']*)|([^'"\s>]+))/i,
    //find_regex_g = /(href|src)\s*=\s*(?:(")([^"]*)|(')([^']*)|([^'"\s>]+))/ig;
    find_regex_g;
    //quotes_regex = /(?:^['"]|['"]$)/g;

find_regex_g = new RegExp(find_regex.source, "ig");

function match_all(regex, str)
{
    var match,
        pos = 0,
        res = [];
    
    /// If it has the global flag, it cannot return the elements in the parenthases, so just run the regex and exit.
    ///TODO: Get regex source and recreate it.
    if (regex.global) {
        return str.match(regex);
    }
    
    /// Make sure to get all of the matching parenthases.
    while ((match = str.substr(pos).match(regex))) {
        res[res.length] = match;
        pos += match.index + (match[0].length || 1);
    }
    
    return res;
}

function clean_link(link)
{
    return decodeURI(String(link));
}

module.exports = function hash_src(options)
{
    var hashes = {};
    
    if (!options || !options.build_dir) {
        throw "Need build_dir";
    }
    
    if (!options.hash) {
        options.hash = "md5";
    }
    if (!options.enc) {
        options.enc = "hex";
    }
    if (!options.exts) {
        options.exts = [".js", ".css", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".pdf", ".ico"];
    }
    
    function get_hashes(data, cb)
    {
        var matches = match_all(find_regex, data);
        
        if (!matches) {
            return setImmediate(cb);
        }
        
        girdle.async_loop(matches, cb, function oneach(match, next)
        {
            var link = clean_link(match[3] || match[5] || match[6]),
                full_path;
            
            if (hashes[link] || options.exts.indexOf(p.extname(link).toLowerCase()) === -1) {
                return next();
            }
            
            full_path = p.join(options.build_dir, link);
            
            fs_helper.fs.exists(full_path, function onres(exists)
            {
                if (!exists) {
                    return next();
                }
                fs_helper.is_dir(full_path, function onres(err, is_dir)
                {
                    if (is_dir) {
                        return next();
                    }
                    fs_helper.hash(full_path, options.hash, options.enc, function onhash(hash)
                    {
                        hashes[link] = hash;
                        next();
                    });
                });
            });
        });
    }
    
    function rewrite(data)
    {
        return data.replace(find_regex_g, function add_hash()
        {
            var link = clean_link(arguments[3] || arguments[5] || arguments[6]),
                quote = arguments[2] || arguments[4] || "";
            
            //console.log(link)
            //console.log(link, quote)
            //process.exit();
            if (hashes[link]) {
                return arguments[1] + "=" + quote + encodeURI(link) + "?" + hashes[link] + quote
            } else {
                return arguments[0];
            }
        });
    }
    
    
    function hash_it(file, encoding, callback)
    {
        var data = file.contents.toString();
        /// file.contents = new Buffer(htmlmin.minify(String(file.contents), opts));
        //console.log(file.contents.toString());process.exit();
        get_hashes(data, function onhash(err)
        {
            file.contents = new Buffer(rewrite(data));
            callback(null, file);
        });
        ///file.contents = new Buffer(rewrite(file.contents.toString()));
        /*
        for (key in file) {
            console.log(key, file[key])
        }
        process.exit();
        console.log(file.path);
        console.log(encoding);
        console.log(callback);
        callback(null, file);
        */
        
        }
    
    return through.obj(hash_it);
};
