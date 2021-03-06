const fs = require('fs')
const assert = require('assert')
const yaml = require('js-yaml')
const path = require('path')
const s3 = require('./aws-s3.js')(process.env); // for s3-Keys
const hb = require("handlebars");
const {s3fix} =  require('/shared/utils.js')
const {parse_s3filename} = require('/shared/utils.js')

module.exports.extract_meta_Moved__to_Shared = function(s) {
  const v = s.split(/\-\-\-/g)
  switch (v.length) {
    case 1:
      console.log(`alert `,v)
      console.log(`alert s:`,s)
      return {meta:{}, md:v[0], err:null}
    case 3: {
      console.log(`@17 v[1]:`,v[1])
      const vv = v[1].split('\n')
      vv.forEach((li,j) =>{
//        console.log(`@18 XXXXXXXXXXXXXXXXXXXX `,{li},{j})
        const new_li = li.replace(/^(\t+)/, (match,$1)=>{
//          console.log(`@19 XXXXXXXXXXXXXXXXXXXX `,{match},{$1})
          return $1.replace('\t','  ')
        })
        vv[j] = new_li
      })
      /*
      const v1 = v[1].replace(/^(\t+)(.*)/gm, (match,$1,$2,offset,string)=>{
        console.log(`@19 `,{match},{$1},{$2},{string})
        return `  ${string}`
      })*/

      const v1 = vv.join('\n')
      console.log(`@18 v1:`,v1)
      const meta = yaml.safeLoad(v1)
      return {meta, md:v[2], err:null}
    }
  }

  return ({err:'Invalid MD-format'});
} // extract-metadata


/*
function safeLoad_md(data) {
  const v = data.split('\-\-\-')
  assert(v.length == 3, `@38 v.length:${v.length}`)
  assert(v[0].trim().length ==0, '@39')
  const meta = yaml.safeLoad(fix_metadata(v[1]))
  const md = v[2]
  return {meta, md}
}
*/


function fix_metadata(s) { // escape ":"
  const v = s.split('\n');
  v.forEach((li,j) =>{
  //    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,'~!~').replace(/<<>>/g,': ')
    v[j] = li.replace(/^([^:]*):\s*/gm,'$1<<>>').replace(/:/g,' ').replace(/<<>>/g,': ')
  })
  return v.join('\n')
}


module.exports.absolute_path = function (fname) {
  if (!fname) return;

  if (fname.match(/^\.{1,2}\//)) {
    return path.join(process.cwd(),fname);
  }
  if (fname.startsWith('/')) return fname;

  return path.join(process.cwd(),fname);
}

// --------------------------------------------------------------------------

module.exports.get_yaml_object = get_yaml_object;

async function get_yaml_object (s3path) {
  const verbose =0;

  ;(verbose >0) && console.log(`@426 Entering get_yaml_object(${s3path})`)

  s3path = s3fix(s3path)
  if (!s3path.startsWith('s3://')) throw `@68 Invalid s3path <${s3path}>`;

  const {Bucket, Key, dir, name} = parse_s3filename(s3path)

  /*
  const retv = await s3.getObjectMetadata(s3path)
  ;(verbose >0) && console.log(`@340 `,retv)
//    console.log(`@341 `,retv.code)
  if (retv.error) {
    console.log(`@341 `,retv.error.code)
    console.log(`@341 `,retv.error.statusCode)
    throw {env:null, fname:root};
  }*/

  const retv2 = await s3.getObject({Bucket, Key})
  if (retv2.error) {
    console.log(`@104 [${module.id}] get-yaml error.code:${retv2.error.code}
      error.statusCode :${retv2.error.statusCode}
      Bucket:<${Bucket}>
      Key:<${Key}>
      s3path:<${s3path}>
      `,)

    return {data:null}; // file not found

//    throw `@91 get_yaml_object error.code:${retv2.error.code} <${s3path}>`
//    throw {env:null, fname:s3path};
  }

//    throw 'break@388 -- return data'
  assert(retv2.Body)
  const env = yaml.safeLoad(retv2.Body.toString('utf8'),'utf8')
  return Object.assign(retv2, {data:env})

}


// -------------------------------------------------------------------------

/*

    check for format in the md-file, if not
    from fileName => parent directory => (.publish.yaml) => format.
    Use a cache

*/

const cache_publish = {
  s3path: null,
  meta: null
};


module.exports.setCustom = function (format) {
  if (format.startsWith('s3://')) {
    throw 'break@142 setCustom'
    /****************
    find parent directory
    *****************/
    assert(format.endsWith('index.md'))
    const {Bucket,Key} =  parse_s3filename(format);
    const {dir,name} =  path.parse(Key);
    assert (name == 'index.md')

    if (!cache_publish.s3path || !meta )

    if (format.startsWith('s3://abatros/yellow')) {
      console.log(`@32 setCustom:<${format}> switched to yellow-book hooks.`)
      return require('./yellow-book.js')
    }
    throw `Invalid setCustom (${format})`;
  }

  switch(format) {
    case 'yellow-book': return require('./yellow-book-v2.js');
    case 'diva-v1':   return require('./blueink-np-v2.js');

    default:
      throw 'break@167'
      console.log(`@133 ${this.filename} setCustom(${format}) defaulted (blueink-np-v2)`)
      return require('./blueink-np-v2.js');
  }

}



// ------------------------------------------------------------------------



module.exports.read_directory = async function (fpath) {
  throw "FATAL@179"
  if (typeof fpath !== 'string') {
    const err_msg = `@450 read_directory `;
    console.log(err_msg,{fpath})
    throw err_msg;
  }

  if (! fpath.startsWith('s3://')) {
    return fs.readdirSync(fpath, 'utf8')
  }

  const dir = await s3.readdir(fpath) // retuns the full path (Key)
  const dir2 = dir.map(({Prefix})=>{
    const {dir,name} = path.parse(Prefix)
    return name;
  })
  //console.log({dir2})
  return dir2;
}

// ---------------------------------------------------------------------

module.exports.compile_template = async function(template_fn) {
  const verbose =0;

//  if (template_fn.startsWith('s3://')) template_fn = template_fn.substring(5);

  const {Bucket, Key} = parse_s3filename(template_fn)
//  's3://blueink/ya13/blueink-page-template-v4.html')
  if (!Bucket || !Key) {
    console.error(`@210 compile_template(${template_fn}) =><${Bucket}><${Key}>`)
    throw `fatal@210 missing-key`
  }


  const o1 = await s3.getObject({Bucket, Key});
  if (!o1.Body) {
    console.log(`@38 [${module.id}] failed to fetch template <${template_fn}>`,{o1})
    throw new Meteor.Error(`failed to fetch template <${template_fn}>`,'file-not-found @compile-template')
  }
  const template = o1.Body.toString('utf8')
  ;(verbose >0) && console.log(`@215 template :
    ---------------------
    ${template}
    ---------------------
    `)

  const compiled_template = hb.compile(template);
  ;(verbose >0) && console.log(`@42 template <${template_fn}> compiled`)
  return compiled_template
};


// -----------------------------------------------------------------------


module.exports.removeLatestVersion =  async function(s3fpath) {
  return await s3.removeLatestVersion(s3fpath)
}




// -------------------------------------------------------------------------

module.exports.get_meta_tags = function ($) { // HEAD
    // return document.getElementsByTagName('meta').e3root.content;
  ////  const selector = `meta[name="${key}"]`
  //  const meta = $('meta').attr('content');
    const meta_tags ={};
    function add(k,v) {
      k = k.replace(/^e3live\./,'')
      if (meta_tags[k] && meta_tags[k]!=v) {
        throw `ALERT-confusion meta_tags[${k}]:${meta_tags[k]}`
      }
      meta_tags[k] = v;
    }


    $('meta').each((j,it) =>{
      const name = $(it).attr('name');
      if (name) {
  //      meta[name] = $(it).attr('content')
        //console.log(`-- meta[${name}]:"${meta[name]}"`)
        add(name, $(it).attr('content'))
      }
    })
    return meta_tags;
  }

// ---------------------------------------------------------------------
// mime-type

/*
module.exports.putObject(s3path, data) {

  const {Bucket,Key} = parse_s3filename(s3fpath);

  const p1 = {
    Bucket,
    Key, //: 'tests/'+Key,
    Body: data,
    ACL: 'public-read',
    ContentType: 'text/md',
    ContentEncoding : 'utf8',
  };
  ;(verbose >0) && console.log(`commit_s3data `,{p1})
  const retv1 = await s3.putObject(p1);
  ;(verbose >0) && console.log({retv1})

}
*/

/*

      ONLY from S3://bucket
      but could be extended to database.

      data: {
        AcceptRanges: 'bytes',
        LastModified: 2020-08-24T22:04:37.000Z,
        ContentLength: 195,
        ETag: '"57e927819cc35465cd0e472a6686f4fa"',
        VersionId: '8tQdAHOzwyENOpWuV8HFq..7YH6wkT7',
        ContentType: 'binary/octet-stream',
        Metadata: {
           's3cmd-attrs': 'atime:1598306668/ctime:1598306668/gid:1000/gname:dkz/md5:57e927819cc35465cd0e472a6686f4fa/mode:33204/mtime:1598306668/uid:1000/uname:dkz'
        },
        StorageClass: 'STANDARD',
        Body: <Buffer>,
        etime: 317
     }

*/

 async function putObject_Obsolete(cmd) {
  const verbose =0;

  let {s3_url, data:Body} = cmd
  const {host, pathname, xid} = cmd
  ;(verbose >0) && console.log('@17: Entering put-s3object ',{cmd})

  s3_url = s3fix(s3_url);

  function content_type(fn) {
    const {ext} = path.parse(fn);
    switch(ext.toLowerCase()) {
      case '.md' : return 'text/md';
      case '.yaml' : return 'text/yaml';
      case '.html' : return 'text/html';
      case '.css' : return 'text/css';
      case '.js' : return 'application/javascript';
      case '.json' : return 'application/json';
    }
    return 'application/text';
  }

  if (s3_url) { // ex: s3://blueink/ya14/1202-Y3K2/1202-Y3K2.index.md

    const {Bucket, Key} = parse_s3filename(s3_url);
    // Key: ya14/1202-Y3K2/1202-Y3K2.index.md
    ;(verbose >0) && console.log({Bucket},{Key})
//    const Key = `${key}/${xid}/${xid}.index.md`;
    const p2 = {
        Bucket,
        Key,
        Body,
        ACL: 'public-read',
        ContentType: content_type(Key),
        ContentEncoding : 'utf8',
    };
    ;(verbose >0) && console.log(`put_s3object `,{p2})
    const retv1 = await s3.putObject(p2);
    ;(verbose >0) && console.log({retv1})

    return {status:'ok', s3_url, Bucket, Key}
  } // s3fpath

  throw '@38 MUST BE S3://BUCKET'

}


// --------------------------------------------------------------------------

module.exports.fix_folder = fix_folder;

async function fix_folder(s3fn) {
  /*
      - readdir
      - for each (index.md) file
          - write the same without extension
  */

  const {Bucket,Key} = parse_s3filename(s3fn)

  const retv = await s3.readdir({
    Bucket,
    Prefix: Key,
    Delimiter: '/index.md'
  });
  console.log(`@357 readdir =>`,retv)
  const list = retv.list.filter(it => it.Prefix)
  for (li of list) {
    console.log(`- mk object for `,li.Prefix)
    const {dir,base} = path.parse(li.Prefix)
    console.log(`- mk object for <${dir}>`)
    const retv = await s3.putObject({
      Bucket,
      Key:dir,
      Body: 'just to keep busy.',
      ContentType: 'text/plain',
      ACL: 'public-read'
    })
    console.log(`@377 putObject =>`,retv)
  }
}

// --------------------------------------------------------------------------

module.exports.fix_folder_v2 = fix_folder_v2;

async function fix_folder_v2(s3fn) {
  /*
      - readdir
      - for each (index.md) file
          - write the same without extension
  */

  const {Bucket,Key} = parse_s3filename(s3fn)

  const retv = await s3.readdir_nofix({
    Bucket,
    Prefix: Key,
    Delimiter: '/index.md'
  });
  //  console.log(`@357 readdir =>`,retv.CommonPrefixes)

  const list = retv.CommonPrefixes.filter(it => (it.Prefix && it.Prefix.endsWith('/index.md')));
  //  console.log(`@358 readdir =>`,list)
  for (li of list) {
    const {dir,base} = path.parse(li.Prefix);
    const new_Key = dir+'.md';
    console.log(`- move object <${Bucket}> <${li.Prefix}> to <${new_Key}>`)
    const retv1 = await s3.moveObject({
      CopySource: `/${Bucket}/${li.Prefix}`,
      Bucket,
      Key: new_Key,
      ContentType: 'text/plain',
      ACL: 'public-read',
    })
    console.log(`@415 copyObjectResult =>`,retv1.CopyObjectResult)

    const retv2 = await s3.deleteObject({
      Bucket,
      Key: dir,
    })
    console.log(`@421 deleteObject =>`,retv2)

  }
}


// --------------------------------------------------------------------------

module.exports.fix_md_mime_type = fix_md_mime_type;

async function fix_md_mime_type(s3fn) {
  /*
      - readdir
      - for each (index.md) file
          - write the same without extension
  */

  const {Bucket,Key} = parse_s3filename(s3fn)

  const retv = await s3.readdir_nofix({
    Bucket,
    Prefix: Key,
    Delimiter: '.md'
  });
  //  console.log(`@357 readdir =>`,retv.CommonPrefixes)

//  const list = retv.CommonPrefixes.filter(it => (it.Prefix && it.Prefix.endsWith('/index.md')));
  const list = retv.CommonPrefixes.filter(it => (it.Prefix));
  let iCount =0;
  //  console.log(`@358 readdir =>`,list)
  for (li of list) {
    const {dir,base} = path.parse(li.Prefix);
    console.log(`- modify header <${Bucket}> <${li.Prefix}>`)

    // copy on itself.
    const retv1 = await s3.copyObject({
      CopySource: `/${Bucket}/${li.Prefix}`,
      Bucket,
      Key: li.Prefix,
      ContentType: 'text/plain',
      ACL: 'public-read',
      MetadataDirective: 'REPLACE',
    })
    console.log(`@415 copyObjectResult =>`,retv1.CopyObjectResult)
    //if (iCount>10) break;
    iCount++
  }
}

// --------------------------------------------------------------------------

module.exports.migration_v1 = migration_v1;

async function migration_v1(s3fn_from, s3fn_to) {
  /*
      - readdir
      - for each (index.md) file
          - write the same without extension
          - move html, jpg and pdf
  */

  const {Bucket,Key} = parse_s3filename(s3fn_from)
  const {Bucket:Bucket_, Key:Key_} = parse_s3filename(s3fn_to)

  const retv = await s3.readdir_nofix({
    Bucket,
    Prefix: Key,
    Delimiter: '.md'
  });
  //  console.log(`@357 readdir =>`,retv.CommonPrefixes)

//  const list = retv.CommonPrefixes.filter(it => (it.Prefix && it.Prefix.endsWith('/index.md')));
  const list = retv.CommonPrefixes.filter(it => (it.Prefix));
  let iCount =0;
  //  console.log(`@358 readdir =>`,list)
  for (li of list) {
    const {dir,base,name} = path.parse(li.Prefix);
    if (base !== 'index.md') continue;
    iCount++

    console.log(`- processing <${Bucket}> <${dir}>`)
    const {Contents, Keys} = await s3.readdir_nofix({Bucket,Prefix:dir})
//    console.log({retv})
    for (it of Keys) {
      const {dir,base,ext} = path.parse(it)
      const {base:xid} = path.parse(dir)
      switch(ext) {
        case '.pdf':
        case '.jpg':
        case '.html':
        const from = path.join(Bucket,dir,base);
        const dest = path.join(Bucket_,Key_,xid,base);
        console.log(`  -- copyObject <s3://${from}> <s3://${dest}>`)
        const {ETag, LastModified} = await s3.copyObject({
          CopySource: from,
          Bucket: Bucket_,
          Key: path.join(Key_,xid,base),
          ACL: 'public-read',
          // ContentType
        })
        console.log(`     ETag: [${ETag}]`)
        break;

        case '.md':
        if (base == 'index.md') {
          const from = path.join(Bucket,dir,base);
          const dest = path.join(Bucket_,Key_,xid)+'.md';
          console.log(`  -- copyObject <s3://${from}> <s3://${dest}>`)
          const {ETag, LastModified} = await s3.copyObject({
              CopySource: from,
              Bucket: Bucket_,
              Key: path.join(Key_,xid)+'.md',
              ACL: 'public-read',
              ContentType: 'text/plain;charset=utf8',
              ContentEncoding: 'utf8',
              MetadataDirective: 'REPLACE',
//              Metadata: {
//                'content-type':''
//              }
            })
          console.log(`     ETag: [${ETag}]`)
          break;
        }

        default:
        // console.log(`  -- IGNORED: <${base}>`)
      }
    } // Keys
    // if (iCount>=4) break;
  } // list
  console.log(`found ${iCount} folders.`)
} // migration_v1
