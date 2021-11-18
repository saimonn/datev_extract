#!/bin/bash

# Where to move extracted pdf if they don't already exist ?
PDF_DIR=".."

# I'm using summon with gopass provider https://github.com/gopasspw/gopass-summon-provider
# and have a secrets.yml with this content:
#     --- 
#     DATEV_USERNAME: !var path/to/datev/entry:USERNAME
#     DATEV_PASSWORD: !var path/to/datev/entry::PASSWORD
#
# alternatively, you can also set only your username with:
#DATEV_USERNAME=johndoe

#summon nodejs datev.js

for src in download/*pdf ;do
  dest="$PDF_DIR/$(basename "${src}")"  
  if test -f "$dest";then
    size_diff=$(( $(stat -c %s "$dest") - $(stat -c %s "$src") ))
    if [ $size_diff -ne 0 ];then
      echo "Size differ from $size_diff bytes between $src and $dest."
      read -p "[S]kip/[o]verwrite dest/[d]elete src ?" ANS
      case $ANS in
        o*|O*) mv -vf "${src}" "$PDF_DIR/" ;;
        d*|D*) rm -vf "${src}" ;;
      esac
    else
      echo "File already exist with the size: ${src}"
      rm -v "${src}"
    fi
  else
    mv -v "${src}" "$PDF_DIR/"
  fi
done
    
