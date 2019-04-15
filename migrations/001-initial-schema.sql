-- Up
create table meta (
  version char(12) default '' not null
);

create table uploads (
  filename char(255) default '' not null primary key
);

create table skips (
  filename char(255) default '' not null primary key
);

insert into meta (version) values('0.0.1');

-- Down
DROP TABLE meta;
DROP TABLE skips;
DROP TABLE downloads;
