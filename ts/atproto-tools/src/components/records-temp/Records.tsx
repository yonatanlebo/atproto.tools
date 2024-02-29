import { FC, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { LOOKING_GLASS_HOST } from "../../constants";
import { JSONRecord } from "../../models/Record";
import { Button } from "../catalyst/button";
import { Field, FieldGroup, Fieldset, Label } from "../catalyst/fieldset";
import { Input } from "../catalyst/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../catalyst/table";
import RawRecord from "./RawRecord";

const Records: FC<{}> = () => {
  const [selectedRecord, setSelectedRecord] = useState<JSONRecord | null>(null);
  const [records, setRecords] = useState<JSONRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [didQuery, setDIDQuery] = useState<string | null>(null);
  const [collectionQuery, setCollectionQuery] = useState<string | null>(null);
  const [rkeyQuery, setRKeyQuery] = useState<string | null>(null);
  const [seqQuery, setSeqQuery] = useState<string | null>(null);

  const [queryInitialized, setQueryInitialized] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = "View Firehose Records";
  }, []);

  const fetchRecords = () => {
    const url = new URL(`${LOOKING_GLASS_HOST}/records`);
    if (didQuery) {
      url.searchParams.append("did", didQuery);
    }
    if (collectionQuery) {
      url.searchParams.append("collection", collectionQuery);
    }
    if (rkeyQuery) {
      url.searchParams.append("rkey", rkeyQuery);
    }
    if (seqQuery) {
      url.searchParams.append("seq", seqQuery);
    }
    fetch(url.toString())
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          const newRecords = data.records.map((record: JSONRecord) => {
            record.key = `${record.seq}_${record.collection}_${record.rkey}`;
            return record;
          });
          let firstRecord = null;
          for (const record of newRecords) {
            if (record.raw) {
              firstRecord = record;
              break;
            }
          }
          setRecords(newRecords);
          setSelectedRecord(firstRecord);
        }
      });
  };

  useEffect(() => {
    // Wait until all query params are set before fetching records
    if (queryInitialized) {
      fetchRecords();
    }
  }, [didQuery, collectionQuery, rkeyQuery, seqQuery, queryInitialized]);

  useEffect(() => {
    searchParams.has("did")
      ? setDIDQuery(searchParams.get("did")!)
      : setDIDQuery(null);
    searchParams.has("collection")
      ? setCollectionQuery(searchParams.get("collection")!)
      : setCollectionQuery(null);
    searchParams.has("rkey")
      ? setRKeyQuery(searchParams.get("rkey")!)
      : setRKeyQuery(null);
    searchParams.has("seq")
      ? setSeqQuery(searchParams.get("seq")!)
      : setSeqQuery(null);

    if (searchParams.has("uri")) {
      // Parse out the AT URI and set the query params
      const uri = searchParams.get("uri")!;
      if (uri.startsWith("at://")) {
        const uriParts = uri.split("/");
        const did = uriParts[2];
        const collection = uriParts[3];
        const rkey = uriParts[4];
        setDIDQuery(did);
        setCollectionQuery(collection);
        setRKeyQuery(rkey);
      }
    }

    setQueryInitialized(true);
  }, [searchParams]);

  return (
    <div className="flex min-h-0 min-w-0 grow flex-col gap-6 p-4 pt-6 lg:h-dvh lg:flex-row">
      <div
        className="flex min-h-0 grow flex-col gap-2 lg:basis-0"
        style={{ colorScheme: "dark" }}
      >
        <h1 className="text-4xl font-bold">View Firehose Records</h1>
        {queryInitialized && (
          <SearchForm
            didQuery={didQuery}
            collectionQuery={collectionQuery}
            rkeyQuery={rkeyQuery}
            seqQuery={seqQuery}
            setSearchParams={setSearchParams}
          />
        )}

        <div className="h-96 min-h-0 grow overflow-y-auto lg:h-auto">
          <RecordsTable
            records={records}
            setSelectedRecord={setSelectedRecord}
            selectedRecord={selectedRecord}
          />
        </div>
      </div>
      <RawRecord record={selectedRecord!} />
    </div>
  );
};

function RecordsTable({
  records,
  selectedRecord,
  setSelectedRecord,
}: {
  records: JSONRecord[];
  selectedRecord: JSONRecord | null;
  setSelectedRecord: (record: JSONRecord) => void;
}) {
  return (
    <Table
      striped
      dense
      grid
      sticky
      className="mx-0 [--gutter:theme(spacing.2)] focus:outline-none sm:[--gutter:theme(spacing.2)]"
      tabIndex={0}
      onKeyDown={(e) => {
        e.preventDefault();
        if (e.key === "ArrowDown" && selectedRecord) {
          const index = records.findIndex(
            (record) => record.key === selectedRecord?.key,
          );
          if (index < records.length - 1) {
            setSelectedRecord(records[index + 1]);
            // Scroll to the selected record
            if (selectedRecord.key) {
              const selectedRecordElement = document.getElementById(
                selectedRecord.key,
              );
              if (selectedRecordElement) {
                selectedRecordElement.scrollIntoView({
                  block: "nearest",
                });
              }
            }
          }
        }
        if (e.key === "ArrowUp" && selectedRecord) {
          const index = records.findIndex(
            (record) => record.key === selectedRecord?.key,
          );
          if (index > 0) {
            setSelectedRecord(records[index - 1]);
            // Scroll to the selected record
            if (selectedRecord.key) {
              const selectedRecordElement = document.getElementById(
                selectedRecord.key,
              );
              if (selectedRecordElement) {
                selectedRecordElement.scrollIntoView({
                  block: "nearest",
                });
              }
            }
          }
        }
      }}
    >
      <TableHead>
        <TableRow>
          <TableHeader>Seq</TableHeader>
          <TableHeader>Repo</TableHeader>
          <TableHeader>Collection</TableHeader>
          <TableHeader>Record Key</TableHeader>
          <TableHeader>Action</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((record) => (
          <TableRow
            key={record?.key || ""}
            id={record?.key || ""}
            className={
              (selectedRecord?.key === record?.key ? "!bg-white/[15%] " : "") +
              " scroll-m-36"
            }
            onClick={() => setSelectedRecord(record)}
          >
            <TableCell className="font-mono text-zinc-400">
              <Tooltip text={record.pds || ""} position="right">
                <span>{record.seq}</span>
              </Tooltip>
            </TableCell>
            <TableCell className="font-mono">
              <Tooltip text={record.handle || ""} position="top">
                <span>{record.repo}</span>
              </Tooltip>
            </TableCell>
            <TableCell className="text-zinc-400">{record.collection}</TableCell>
            <TableCell className="font-mono">{record.rkey}</TableCell>
            <TableCell className="text-zinc-400">{record.action}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SearchForm({
  didQuery,
  collectionQuery,
  rkeyQuery,
  seqQuery,
  setSearchParams,
}: {
  didQuery: string | null;
  collectionQuery: string | null;
  rkeyQuery: string | null;
  seqQuery: string | null;
  setSearchParams: (searchParams: URLSearchParams) => void;
}) {
  const [didSearch, setDIDSearch] = useState<string | null>(didQuery);
  const [collectionSearch, setCollectionSearch] = useState<string | null>(
    collectionQuery,
  );
  const [rkeySearch, setRKeySearch] = useState<string | null>(rkeyQuery);
  const [seqSearch, setSeqSearch] = useState<string | null>(seqQuery);

  const handleSearch = () => {
    const searchParams = new URLSearchParams();
    if (didSearch) {
      searchParams.append("did", didSearch);
    }
    if (collectionSearch) {
      searchParams.append("collection", collectionSearch);
    }
    if (rkeySearch) {
      searchParams.append("rkey", rkeySearch);
    }
    if (seqSearch) {
      searchParams.append("seq", seqSearch);
    }
    setSearchParams(searchParams);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch();
      }}
    >
      <Fieldset className="mb-4">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-9 sm:gap-4">
            <Field className="col-span-1">
              <Label>Seq</Label>
              <Input
                name="seq"
                value={seqSearch || ""}
                onChange={(e) => setSeqSearch(e.target.value.trim())}
              />
            </Field>
            <Field className="col-span-3">
              <Label>DID</Label>
              <Input
                name="did"
                value={didSearch || ""}
                onChange={(e) => setDIDSearch(e.target.value.trim())}
              />
            </Field>
            <Field className="col-span-2">
              <Label>Collection</Label>
              <Input
                name="collection"
                value={collectionSearch || ""}
                onChange={(e) => setCollectionSearch(e.target.value.trim())}
                disabled={didSearch === null || didSearch === ""}
              />
            </Field>
            <Field className="col-span-2">
              <Label>Record Key</Label>
              <Input
                name="rkey"
                value={rkeySearch || ""}
                onChange={(e) => setRKeySearch(e.target.value.trim())}
                disabled={
                  didSearch === null ||
                  didSearch === "" ||
                  collectionSearch === null ||
                  collectionSearch === ""
                }
              />
            </Field>

            <div className="mt-auto justify-self-end">
              <Button onClick={handleSearch} type="submit">
                Search
              </Button>
            </div>
          </div>
        </FieldGroup>
      </Fieldset>
    </form>
  );
}

type PositionKey = "top" | "bottom" | "left" | "right";

const positionStyles: { [key in PositionKey]: string } = {
  top: "bottom-[calc(100%+0.5rem)] left-[38%] -translate-x-[50%]",
  bottom: "top-[calc(100%+0.5rem)] left-[38%] -translate-x-[50%]",
  left: "right-[calc(100%+0.5rem)] top-[38%] -translate-y-[50%]",
  right: "left-[calc(100%+0.5rem)] top-[38%] -translate-y-[50%]",
};

const positionSVGs: { [key in PositionKey]: JSX.Element } = {
  top: (
    <svg
      className="absolute left-0 top-full h-2 w-full text-black"
      x="0px"
      y="0px"
      viewBox="0 0 255 255"
    >
      <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
    </svg>
  ),
  bottom: (
    <svg
      className="absolute bottom-full left-0 h-2 w-full text-black"
      x="0px"
      y="0px"
      viewBox="0 0 255 255"
    >
      <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
    </svg>
  ),
  left: (
    <svg
      className="absolute left-full top-0 h-full w-2 text-black"
      x="0px"
      y="0px"
      viewBox="0 0 255 255"
    >
      <polygon className="fill-current" points="0,0 127.5,127.5 0,255" />
    </svg>
  ),
  right: (
    <svg
      className="absolute right-full top-0 h-full w-2 text-black"
      x="0px"
      y="0px"
      viewBox="0 0 255 255"
    >
      <polygon className="fill-current" points="255,0 0,127.5 255,255" />
    </svg>
  ),
};

function Tooltip({
  children,
  text,
  position,
}: {
  children: React.ReactNode;
  text: string;
  position: PositionKey;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`absolute z-30 ${positionStyles[position]} hidden w-auto transition duration-300 ease-in-out group-hover:block ${!showTooltip ? "hidden opacity-0" : "opacity-100"}`}
      >
        <div className="bottom-full right-0 whitespace-nowrap rounded bg-black px-4 py-1 text-xs text-white">
          {text}
          {positionSVGs[position]}
        </div>
      </div>
      {children}
    </div>
  );
}

export default Records;
