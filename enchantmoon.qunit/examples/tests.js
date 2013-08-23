test( "hello test", function() {
  ok( 1 == "1", "Passed!" );
});

test( "check navigator", function() {
  var expect = "UEI Eagle Version 0.2, somewhat like 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11' - UEI Eagle Build Date: Jun 19 2013 (13:09:20)";
  equal(navigator.userAgent, expect, "navigator is expected");
});

test( "test to fail", function() {
  ok( 1 == "2", "Passed!" );
});


